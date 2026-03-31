import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { CreateStatEntrySchema } from "@shared/schemas";
import StatEntry from "../models/StatEntry";
import StatCard from "../models/StatCard";
import CoachAthlete from "../models/CoachAthlete";

const router = Router();
router.use(authenticate);

type HealthSyncBody = {
  steps?: number | null;
  sleepMinutes?: number | null;
  heartRateAvg?: number | null;
  heartRateMin?: number | null;
  heartRateMax?: number | null;
  caloriesActive?: number | null;
  caloriesTotal?: number | null;
  distanceMeters?: number | null;
  workouts?: Array<{
    exerciseType?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  }>;
  recordedAt?: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const upsertDailyEntry = async ({
  athleteId,
  cardId,
  value,
  secondaryValue,
  note,
  recordedAt,
}: {
  athleteId: string;
  cardId: string;
  value: number;
  secondaryValue?: number;
  note?: string;
  recordedAt: Date;
}) => {
  const dayStart = startOfDay(recordedAt);
  const dayEnd = endOfDay(recordedAt);

  const existing = await StatEntry.findOne({
    athleteId,
    cardId,
    recordedAt: { $gte: dayStart, $lte: dayEnd },
  }).sort({ recordedAt: -1 });

  if (existing) {
    existing.value = value;
    existing.secondaryValue = secondaryValue;
    existing.note = note;
    existing.recordedAt = recordedAt;
    await existing.save();
    return existing;
  }

  return StatEntry.create({
    athleteId,
    cardId,
    value,
    secondaryValue,
    note,
    recordedAt,
  });
};

const ensureCard = async ({
  athleteId,
  type,
  label,
  unit,
}: {
  athleteId: string;
  type: "heartrate" | "calories" | "weight" | "steps" | "sleep" | "custom";
  label: string;
  unit: string;
}) => {
  let card = await StatCard.findOne({ athleteId, type, label });

  if (!card && type !== "custom") {
    card = await StatCard.findOne({ athleteId, type });
  }

  if (!card) {
    const count = await StatCard.countDocuments({ athleteId });
    card = await StatCard.create({
      athleteId,
      type,
      label,
      unit,
      order: count,
      visible: true,
    });
  }

  return card;
};

// POST /api/stats/health-sync
router.post("/health-sync", async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "athlete") {
    res
      .status(403)
      .json({ success: false, error: "Only athletes can sync health data" });
    return;
  }

  const body = (req.body ?? {}) as HealthSyncBody;
  const athleteId = req.user.userId;
  const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();

  if (Number.isNaN(recordedAt.getTime())) {
    res.status(400).json({ success: false, error: "Invalid recordedAt date" });
    return;
  }

  try {
    const saved: string[] = [];

    const stepsCard = await ensureCard({
      athleteId,
      type: "steps",
      label: "Steps",
      unit: "steps",
    });

    const sleepCard = await ensureCard({
      athleteId,
      type: "sleep",
      label: "Sleep",
      unit: "min",
    });

    const heartRateCard = await ensureCard({
      athleteId,
      type: "heartrate",
      label: "Heart Rate",
      unit: "bpm",
    });

    const caloriesCard = await ensureCard({
      athleteId,
      type: "calories",
      label: "Active Calories",
      unit: "kcal",
    });

    const totalCaloriesCard = await ensureCard({
      athleteId,
      type: "custom",
      label: "Total Calories",
      unit: "kcal",
    });

    const distanceCard = await ensureCard({
      athleteId,
      type: "custom",
      label: "Distance",
      unit: "m",
    });

    const workoutCard = await ensureCard({
      athleteId,
      type: "custom",
      label: "Workout Minutes",
      unit: "min",
    });

    if (isFiniteNumber(body.steps)) {
      await upsertDailyEntry({
        athleteId,
        cardId: stepsCard._id.toString(),
        value: body.steps,
        recordedAt,
      });
      saved.push("steps");
    }

    if (isFiniteNumber(body.sleepMinutes)) {
      await upsertDailyEntry({
        athleteId,
        cardId: sleepCard._id.toString(),
        value: body.sleepMinutes,
        recordedAt,
      });
      saved.push("sleepMinutes");
    }

    if (isFiniteNumber(body.heartRateAvg)) {
      const noteParts = [
        isFiniteNumber(body.heartRateMin) ? `min:${body.heartRateMin}` : null,
        isFiniteNumber(body.heartRateMax) ? `max:${body.heartRateMax}` : null,
      ].filter(Boolean);

      await upsertDailyEntry({
        athleteId,
        cardId: heartRateCard._id.toString(),
        value: body.heartRateAvg,
        note: noteParts.join(" | ") || undefined,
        recordedAt,
      });
      saved.push("heartRateAvg");
    }

    if (isFiniteNumber(body.caloriesActive)) {
      await upsertDailyEntry({
        athleteId,
        cardId: caloriesCard._id.toString(),
        value: body.caloriesActive,
        recordedAt,
      });
      saved.push("caloriesActive");
    }

    if (isFiniteNumber(body.caloriesTotal)) {
      await upsertDailyEntry({
        athleteId,
        cardId: totalCaloriesCard._id.toString(),
        value: body.caloriesTotal,
        recordedAt,
      });
      saved.push("caloriesTotal");
    }

    if (isFiniteNumber(body.distanceMeters)) {
      await upsertDailyEntry({
        athleteId,
        cardId: distanceCard._id.toString(),
        value: body.distanceMeters,
        recordedAt,
      });
      saved.push("distanceMeters");
    }

    if (Array.isArray(body.workouts) && body.workouts.length > 0) {
      const totalWorkoutMinutes = body.workouts.reduce((sum, workout) => {
        const minutes = isFiniteNumber(workout?.durationMinutes)
          ? workout.durationMinutes
          : 0;
        return sum + minutes;
      }, 0);

      if (totalWorkoutMinutes > 0) {
        await upsertDailyEntry({
          athleteId,
          cardId: workoutCard._id.toString(),
          value: totalWorkoutMinutes,
          note: body.workouts
            .map((w) => w.exerciseType || "WORKOUT")
            .join(", "),
          recordedAt,
        });
        saved.push("workouts");
      }
    }

    res.json({
      success: true,
      data: {
        saved,
        recordedAt: recordedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Health sync error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/stats/entries
router.post("/entries", async (req: AuthRequest, res: Response) => {
  const parsed = CreateStatEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  try {
    const card = await StatCard.findOne({
      _id: parsed.data.cardId,
      athleteId: req.user!.userId,
    });
    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    const entry = await StatEntry.create({
      ...parsed.data,
      athleteId: req.user!.userId,
      recordedAt: parsed.data.recordedAt ?? new Date(),
    });

    res.status(201).json({ success: true, data: entry });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/stats/entries/:id
router.delete("/entries/:id", async (req: AuthRequest, res: Response) => {
  try {
    const entry = await StatEntry.findOneAndDelete({
      _id: req.params.id,
      athleteId: req.user!.userId,
    });
    if (!entry) {
      res.status(404).json({ success: false, error: "Entry not found" });
      return;
    }
    res.json({ success: true, message: "Entry deleted" });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/entries/:cardId
router.get("/entries/:cardId", async (req: AuthRequest, res: Response) => {
  try {
    const card = await StatCard.findById(req.params.cardId);
    if (!card) {
      res.status(404).json({ success: false, error: "Card not found" });
      return;
    }

    if (req.user!.role === "coach") {
      const relation = await CoachAthlete.findOne({
        coachId: req.user!.userId,
        athleteId: card.athleteId,
        status: "active",
        allowedMetrics: card._id,
      });
      if (!relation) {
        res
          .status(403)
          .json({ success: false, error: "Access not granted by athlete" });
        return;
      }
    } else if (card.athleteId.toString() !== req.user!.userId) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const entries = await StatEntry.find({ cardId: req.params.cardId })
      .sort({ recordedAt: -1 })
      .limit(90);

    res.json({ success: true, data: entries.reverse() });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/latest
router.get("/latest", async (req: AuthRequest, res: Response) => {
  try {
    const cards = await StatCard.find({ athleteId: req.user!.userId });
    const latest = await Promise.all(
      cards.map(async (card) => {
        const entry = await StatEntry.findOne({ cardId: card._id }).sort({
          recordedAt: -1,
        });
        return { card, latest: entry ?? null };
      })
    );
    res.json({ success: true, data: latest });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
