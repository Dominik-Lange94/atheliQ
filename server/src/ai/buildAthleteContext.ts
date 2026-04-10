import mongoose from "mongoose";
import User from "../models/User";
import StatCard from "../models/StatCard";
import StatEntry from "../models/StatEntry";
import AthleteProfile from "../models/AthleteProfile";

type TrendPoint = {
  date: string;
  value: number;
};

type TrendSummary = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  trend: "up" | "down" | "flat";
  firstValue: number | null;
  lastValue: number | null;
  delta: number | null;
  points: TrendPoint[];
};

function startOfDay(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T23:59:59.999Z`) : new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function calculateAgeFromBirthDate(birthDate?: Date | null): number | null {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();

  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age--;
  }

  return age >= 0 ? age : null;
}

function calculateBmi(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const hm = heightCm / 100;
  return Number((weightKg / (hm * hm)).toFixed(1));
}

function calculateDaysUntil(date?: Date | null) {
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function normalizeUnitSystem(unitSystem?: string | null) {
  return unitSystem === "imperial" ? "imperial" : "metric";
}

function summarizeTrend(points: TrendPoint[]): {
  trend: "up" | "down" | "flat";
  firstValue: number | null;
  lastValue: number | null;
  delta: number | null;
} {
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;

  if (typeof first !== "number" || typeof last !== "number") {
    return {
      trend: "flat",
      firstValue: null,
      lastValue: null,
      delta: null,
    };
  }

  const delta = Number((last - first).toFixed(2));

  if (delta > 0) {
    return {
      trend: "up",
      firstValue: first,
      lastValue: last,
      delta,
    };
  }

  if (delta < 0) {
    return {
      trend: "down",
      firstValue: first,
      lastValue: last,
      delta,
    };
  }

  return {
    trend: "flat",
    firstValue: first,
    lastValue: last,
    delta: 0,
  };
}

export async function buildAthleteAiContext(
  athleteId: string,
  selectedDate?: string
) {
  const athleteObjectId = new mongoose.Types.ObjectId(athleteId);

  const [user, profile, cards] = await Promise.all([
    User.findById(athleteId).select("name email role").lean(),
    AthleteProfile.findOne({ athleteId }).lean(),
    StatCard.find({ athleteId: athleteObjectId }).sort({ order: 1 }).lean(),
  ]);

  const cardIds = cards.map((c: any) => c._id);

  const [latestEntriesAgg, dayEntries, trendEntries] = await Promise.all([
    StatEntry.aggregate([
      {
        $match: {
          athleteId: athleteObjectId,
          cardId: { $in: cardIds },
        },
      },
      { $sort: { recordedAt: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$cardId",
          entry: { $first: "$$ROOT" },
        },
      },
    ]),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: startOfDay(selectedDate),
        $lte: endOfDay(selectedDate),
      },
    })
      .sort({ recordedAt: -1, createdAt: -1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
  ]);

  const cardMap = new Map(cards.map((c: any) => [String(c._id), c]));

  const latest = latestEntriesAgg
    .map((item: any) => {
      const card = cardMap.get(String(item._id));
      if (!card) return null;

      return {
        cardId: String(card._id),
        label: card.label,
        type: card.type,
        unit: card.unit,
        color: card.color ?? null,
        chartType: card.chartType ?? "line",
        value: item.entry.value ?? null,
        secondaryValue: item.entry.secondaryValue ?? null,
        note: item.entry.note ?? "",
        recordedAt: item.entry.recordedAt ?? item.entry.createdAt ?? null,
      };
    })
    .filter(Boolean);

  const day = dayEntries
    .map((entry: any) => {
      const card = cardMap.get(String(entry.cardId));
      if (!card) return null;

      return {
        cardId: String(card._id),
        label: card.label,
        type: card.type,
        unit: card.unit,
        value: entry.value ?? null,
        secondaryValue: entry.secondaryValue ?? null,
        note: entry.note ?? "",
        recordedAt: entry.recordedAt ?? entry.createdAt ?? null,
      };
    })
    .filter(Boolean);

  const trendGroups = new Map<
    string,
    {
      cardId: string;
      label: string;
      type: string;
      unit: string;
      points: TrendPoint[];
    }
  >();

  for (const entry of trendEntries as any[]) {
    const card = cardMap.get(String(entry.cardId));
    if (!card || typeof entry.value !== "number") continue;

    const key = String(card._id);
    const current = trendGroups.get(key) ?? {
      cardId: key,
      label: card.label,
      type: card.type,
      unit: card.unit,
      points: [],
    };

    current.points.push({
      date: new Date(entry.recordedAt ?? entry.createdAt)
        .toISOString()
        .slice(0, 10),
      value: entry.value,
    });

    trendGroups.set(key, current);
  }

  const trends: TrendSummary[] = [...trendGroups.values()].map((item) => {
    const summary = summarizeTrend(item.points);
    return {
      cardId: item.cardId,
      label: item.label,
      type: item.type,
      unit: item.unit,
      trend: summary.trend,
      firstValue: summary.firstValue,
      lastValue: summary.lastValue,
      delta: summary.delta,
      points: item.points.slice(-10),
    };
  });

  const latestWeight =
    latest.find((item: any) => item.type === "weight")?.value ??
    profile?.currentWeightKg ??
    null;

  const athleteAge = calculateAgeFromBirthDate(profile?.birthDate ?? null);
  const bmi = calculateBmi(profile?.heightCm ?? null, latestWeight);
  const daysUntilEvent = calculateDaysUntil(profile?.eventDate ?? null);

  return {
    athlete: {
      id: athleteId,
      name: user?.name || "Athlete",
      email: user?.email || "",
      role: user?.role || "athlete",
      age: athleteAge,
    },

    profile: profile
      ? {
          currentWeightKg: profile.currentWeightKg ?? null,
          targetWeightKg: profile.targetWeightKg ?? null,
          heightCm: profile.heightCm ?? null,
          gender: profile.gender ?? null,

          primaryGoal: profile.primaryGoal ?? null,
          reason: profile.reason ?? null,
          eventType: profile.eventType ?? null,
          eventDate: profile.eventDate ?? null,
          daysUntilEvent,

          workLifestyle: profile.workLifestyle ?? null,
          activityLevel: profile.activityLevel ?? null,
          experienceLevel: profile.experienceLevel ?? null,
          workoutsPerWeek: profile.workoutsPerWeek ?? null,

          painPoints: profile.painPoints ?? [],
          dietPreference: profile.dietPreference ?? null,

          goalSpeed: profile.goalSpeed ?? null,
          trainingLocation: profile.trainingLocation ?? null,
          equipmentLevel: profile.equipmentLevel ?? null,
          sleepQuality: profile.sleepQuality ?? null,
          stressLevel: profile.stressLevel ?? null,
          mealStructure: profile.mealStructure ?? null,
          aiTone: profile.aiTone ?? null,
          unitSystem: normalizeUnitSystem(profile.unitSystem ?? null),

          availableDays: profile.availableDays ?? [],
          limitations: profile.limitations ?? [],
          notes: profile.notes ?? "",

          startMode: profile.startMode ?? null,
          selectedTemplate: profile.selectedTemplate ?? null,

          onboardingCompleted: profile.onboardingCompleted ?? false,
          completedAt: profile.completedAt ?? null,
          profileVersion: profile.profileVersion ?? 1,
        }
      : null,

    derived: {
      bmi,
      currentWeightKg: latestWeight,
      targetWeightKg: profile?.targetWeightKg ?? null,
      weightDeltaToGoal:
        typeof latestWeight === "number" &&
        typeof profile?.targetWeightKg === "number"
          ? Number((profile.targetWeightKg - latestWeight).toFixed(2))
          : null,
      selectedDate: selectedDate || new Date().toISOString().slice(0, 10),
      cardCount: cards.length,
      hasAnyStats: latest.length > 0 || day.length > 0 || trends.length > 0,
    },

    latest,
    day,
    trends,
  };
}
