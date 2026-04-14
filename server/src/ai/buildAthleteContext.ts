import mongoose from "mongoose";
import User from "../models/User";
import StatCard from "../models/StatCard";
import StatEntry from "../models/StatEntry";
import AthleteProfile from "../models/AthleteProfile";

type TrendDirection = "up" | "down" | "flat";

type TrendPoint = {
  date: string;
  value: number;
};

type DayMetricEntry = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  value: number | null;
  secondaryValue: number | null;
  note: string;
  recordedAt: Date | null;
};

type LatestMetricEntry = DayMetricEntry & {
  color: string | null;
  chartType: string;
};

type TrendSummary = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  trend: TrendDirection;
  firstValue: number | null;
  lastValue: number | null;
  delta: number | null;
  percentChange: number | null;
  minValue: number | null;
  maxValue: number | null;
  averageValue: number | null;
  points: TrendPoint[];
};

type RangeMetricSummary = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  entryCount: number;
  activeDays: number;
  firstValue: number | null;
  lastValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  averageValue: number | null;
  sumValue: number | null;
  trend: TrendDirection;
  delta: number | null;
  percentChange: number | null;
  latestRecordedAt: string | null;
};

type ComparisonSummary = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  currentAverage: number | null;
  previousAverage: number | null;
  averageDelta: number | null;
  averageDeltaPercent: number | null;
  currentSum: number | null;
  previousSum: number | null;
  sumDelta: number | null;
  trend: TrendDirection;
  interpretation: "improved" | "declined" | "stable" | "insufficient_data";
};

type BestValueSummary = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  bestValue: number | null;
  bestDate: string | null;
  latestValue: number | null;
  gapToBest: number | null;
  gapPercentToBest: number | null;
};

type GoalProgressSummary = {
  hasGoal: boolean;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  startWeightKg: number | null;
  remainingToGoalKg: number | null;
  totalGoalDistanceKg: number | null;
  progressKg: number | null;
  progressPercent: number | null;
  directionToGoal: "lose" | "gain" | "maintain" | "unknown";
};

type TodayVsYesterdaySummary = {
  cardId: string;
  label: string;
  type: string;
  unit: string;
  todayValue: number | null;
  yesterdayValue: number | null;
  delta: number | null;
  percentChange: number | null;
  trend: TrendDirection;
};

type ConsistencySummary = {
  trackedDays7d: number;
  trackedDays30d: number;
  totalEntries7d: number;
  totalEntries30d: number;
  consistencyScore7d: number;
  consistencyScore30d: number;
};

type PerformanceSnapshot = {
  strongestPositiveMetric: ComparisonSummary | null;
  biggestDropMetric: ComparisonSummary | null;
  mostConsistentMetric: RangeMetricSummary | null;
  mostRecentlyTrackedMetric: RangeMetricSummary | null;
  bestMetricToday: TodayVsYesterdaySummary | null;
};

type NormalizedEntry = {
  cardId: string;
  athleteId: string;
  value: number | null;
  secondaryValue: number | null;
  note: string;
  recordedAt: Date;
  createdAt: Date;
};

function startOfUtcDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfUtcDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function addUtcDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseSelectedDate(dateStr?: string) {
  if (!dateStr) return startOfUtcDay(new Date());
  return startOfUtcDay(new Date(`${dateStr}T00:00:00.000Z`));
}

function toDateKey(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function safeRound(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function average(values: number[]) {
  if (!values.length) return null;
  return safeRound(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

function sum(values: number[]) {
  if (!values.length) return null;
  return safeRound(values.reduce((acc, value) => acc + value, 0));
}

function min(values: number[]) {
  if (!values.length) return null;
  return safeRound(Math.min(...values));
}

function max(values: number[]) {
  if (!values.length) return null;
  return safeRound(Math.max(...values));
}

function percentChange(from: number | null, to: number | null) {
  if (
    typeof from !== "number" ||
    typeof to !== "number" ||
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from === 0
  ) {
    return null;
  }

  return safeRound(((to - from) / Math.abs(from)) * 100);
}

function getTrendFromDelta(delta: number | null): TrendDirection {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "flat";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
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
  return safeRound(weightKg / (hm * hm), 1);
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

function summarizeTrend(points: TrendPoint[]) {
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;

  if (typeof first !== "number" || typeof last !== "number") {
    return {
      trend: "flat" as TrendDirection,
      firstValue: null,
      lastValue: null,
      delta: null,
      percentChange: null,
    };
  }

  const delta = safeRound(last - first);
  return {
    trend: getTrendFromDelta(delta),
    firstValue: first,
    lastValue: last,
    delta,
    percentChange: percentChange(first, last),
  };
}

function normalizeEntry(entry: any): NormalizedEntry {
  return {
    cardId: String(entry.cardId),
    athleteId: String(entry.athleteId),
    value: typeof entry.value === "number" ? entry.value : null,
    secondaryValue:
      typeof entry.secondaryValue === "number" ? entry.secondaryValue : null,
    note: entry.note ?? "",
    recordedAt: new Date(entry.recordedAt ?? entry.createdAt ?? new Date()),
    createdAt: new Date(entry.createdAt ?? entry.recordedAt ?? new Date()),
  };
}

function buildRangeSummary(
  card: any,
  entries: NormalizedEntry[]
): RangeMetricSummary {
  const numericValues = entries
    .map((entry) => entry.value)
    .filter((value): value is number => typeof value === "number");

  const firstValue = numericValues[0] ?? null;
  const lastValue = numericValues[numericValues.length - 1] ?? null;
  const delta =
    typeof firstValue === "number" && typeof lastValue === "number"
      ? safeRound(lastValue - firstValue)
      : null;

  const uniqueDays = new Set(
    entries.map((entry) => toDateKey(entry.recordedAt)).filter(Boolean)
  );

  return {
    cardId: String(card._id),
    label: card.label,
    type: card.type,
    unit: card.unit,
    entryCount: entries.length,
    activeDays: uniqueDays.size,
    firstValue,
    lastValue,
    minValue: min(numericValues),
    maxValue: max(numericValues),
    averageValue: average(numericValues),
    sumValue: sum(numericValues),
    trend: getTrendFromDelta(delta),
    delta,
    percentChange: percentChange(firstValue, lastValue),
    latestRecordedAt: entries.length
      ? entries[entries.length - 1].recordedAt.toISOString()
      : null,
  };
}

function buildComparison(
  current: RangeMetricSummary,
  previous: RangeMetricSummary
): ComparisonSummary {
  const avgDelta =
    typeof current.averageValue === "number" &&
    typeof previous.averageValue === "number"
      ? safeRound(current.averageValue - previous.averageValue)
      : null;

  const sumDelta =
    typeof current.sumValue === "number" &&
    typeof previous.sumValue === "number"
      ? safeRound(current.sumValue - previous.sumValue)
      : null;

  let interpretation: ComparisonSummary["interpretation"] = "insufficient_data";
  if (
    typeof current.averageValue === "number" &&
    typeof previous.averageValue === "number"
  ) {
    if ((avgDelta ?? 0) > 0) interpretation = "improved";
    else if ((avgDelta ?? 0) < 0) interpretation = "declined";
    else interpretation = "stable";
  }

  return {
    cardId: current.cardId,
    label: current.label,
    type: current.type,
    unit: current.unit,
    currentAverage: current.averageValue,
    previousAverage: previous.averageValue,
    averageDelta: avgDelta,
    averageDeltaPercent: percentChange(
      previous.averageValue,
      current.averageValue
    ),
    currentSum: current.sumValue,
    previousSum: previous.sumValue,
    sumDelta,
    trend: getTrendFromDelta(avgDelta),
    interpretation,
  };
}

function buildBestValueSummary(
  card: any,
  entries: NormalizedEntry[]
): BestValueSummary {
  const numericEntries = entries.filter(
    (entry): entry is NormalizedEntry & { value: number } =>
      typeof entry.value === "number"
  );

  if (!numericEntries.length) {
    return {
      cardId: String(card._id),
      label: card.label,
      type: card.type,
      unit: card.unit,
      bestValue: null,
      bestDate: null,
      latestValue: null,
      gapToBest: null,
      gapPercentToBest: null,
    };
  }

  const bestEntry = numericEntries.reduce((best, current) => {
    if (!best) return current;
    return current.value > best.value ? current : best;
  }, null as (NormalizedEntry & { value: number }) | null);

  const latestEntry = numericEntries[numericEntries.length - 1];

  return {
    cardId: String(card._id),
    label: card.label,
    type: card.type,
    unit: card.unit,
    bestValue: bestEntry?.value ?? null,
    bestDate: bestEntry ? toDateKey(bestEntry.recordedAt) : null,
    latestValue: latestEntry?.value ?? null,
    gapToBest:
      bestEntry && latestEntry
        ? safeRound(bestEntry.value - latestEntry.value)
        : null,
    gapPercentToBest:
      bestEntry && latestEntry
        ? percentChange(latestEntry.value, bestEntry.value)
        : null,
  };
}

function groupEntriesByCard(entries: NormalizedEntry[]) {
  const map = new Map<string, NormalizedEntry[]>();

  for (const entry of entries) {
    const list = map.get(entry.cardId) ?? [];
    list.push(entry);
    map.set(entry.cardId, list);
  }

  for (const [key, list] of map.entries()) {
    list.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    map.set(key, list);
  }

  return map;
}

function getLatestEntryPerCard(entries: NormalizedEntry[]) {
  const map = new Map<string, NormalizedEntry>();

  for (const entry of entries) {
    const existing = map.get(entry.cardId);
    if (
      !existing ||
      existing.recordedAt.getTime() < entry.recordedAt.getTime()
    ) {
      map.set(entry.cardId, entry);
    }
  }

  return map;
}

function buildDayMetricEntries(
  entries: NormalizedEntry[],
  cardMap: Map<string, any>
): DayMetricEntry[] {
  return entries
    .map((entry) => {
      const card = cardMap.get(entry.cardId);
      if (!card) return null;

      return {
        cardId: String(card._id),
        label: card.label,
        type: card.type,
        unit: card.unit,
        value: entry.value ?? null,
        secondaryValue: entry.secondaryValue ?? null,
        note: entry.note ?? "",
        recordedAt: entry.recordedAt ?? null,
      };
    })
    .filter(Boolean) as DayMetricEntry[];
}

function buildTodayVsYesterday(
  todayEntries: NormalizedEntry[],
  yesterdayEntries: NormalizedEntry[],
  cardMap: Map<string, any>
): TodayVsYesterdaySummary[] {
  const todayLatest = getLatestEntryPerCard(todayEntries);
  const yesterdayLatest = getLatestEntryPerCard(yesterdayEntries);
  const cardIds = new Set([...todayLatest.keys(), ...yesterdayLatest.keys()]);

  return [...cardIds]
    .map((cardId) => {
      const card = cardMap.get(cardId);
      if (!card) return null;

      const todayValue = todayLatest.get(cardId)?.value ?? null;
      const yesterdayValue = yesterdayLatest.get(cardId)?.value ?? null;

      const delta =
        typeof todayValue === "number" && typeof yesterdayValue === "number"
          ? safeRound(todayValue - yesterdayValue)
          : null;

      return {
        cardId,
        label: card.label,
        type: card.type,
        unit: card.unit,
        todayValue,
        yesterdayValue,
        delta,
        percentChange: percentChange(yesterdayValue, todayValue),
        trend: getTrendFromDelta(delta),
      };
    })
    .filter(Boolean) as TodayVsYesterdaySummary[];
}

function buildGoalProgress(
  profile: any,
  weightEntries: NormalizedEntry[],
  latestWeight: number | null
): GoalProgressSummary {
  const targetWeightKg =
    typeof profile?.targetWeightKg === "number" ? profile.targetWeightKg : null;

  const startWeightKg = weightEntries.length
    ? weightEntries.find((entry) => typeof entry.value === "number")?.value ??
      null
    : typeof profile?.currentWeightKg === "number"
    ? profile.currentWeightKg
    : null;

  if (targetWeightKg === null || latestWeight === null) {
    return {
      hasGoal: false,
      currentWeightKg: latestWeight,
      targetWeightKg,
      startWeightKg,
      remainingToGoalKg: null,
      totalGoalDistanceKg: null,
      progressKg: null,
      progressPercent: null,
      directionToGoal: "unknown",
    };
  }

  const totalGoalDistanceKg =
    startWeightKg !== null
      ? safeRound(Math.abs(targetWeightKg - startWeightKg))
      : null;

  const remainingToGoalKg = safeRound(targetWeightKg - latestWeight);

  const progressKg =
    startWeightKg !== null
      ? safeRound(Math.abs(startWeightKg - latestWeight))
      : null;

  const progressPercent =
    typeof totalGoalDistanceKg === "number" &&
    totalGoalDistanceKg > 0 &&
    typeof progressKg === "number"
      ? safeRound(Math.min((progressKg / totalGoalDistanceKg) * 100, 100), 1)
      : null;

  let directionToGoal: GoalProgressSummary["directionToGoal"] = "maintain";
  if (latestWeight > targetWeightKg) directionToGoal = "lose";
  else if (latestWeight < targetWeightKg) directionToGoal = "gain";

  return {
    hasGoal: true,
    currentWeightKg: latestWeight,
    targetWeightKg,
    startWeightKg,
    remainingToGoalKg,
    totalGoalDistanceKg,
    progressKg,
    progressPercent,
    directionToGoal,
  };
}

function buildConsistencySummary(
  entries7d: NormalizedEntry[],
  entries30d: NormalizedEntry[]
): ConsistencySummary {
  const trackedDays7d = new Set(
    entries7d.map((entry) => toDateKey(entry.recordedAt)).filter(Boolean)
  ).size;

  const trackedDays30d = new Set(
    entries30d.map((entry) => toDateKey(entry.recordedAt)).filter(Boolean)
  ).size;

  return {
    trackedDays7d,
    trackedDays30d,
    totalEntries7d: entries7d.length,
    totalEntries30d: entries30d.length,
    consistencyScore7d: safeRound((trackedDays7d / 7) * 100, 1) ?? 0,
    consistencyScore30d: safeRound((trackedDays30d / 30) * 100, 1) ?? 0,
  };
}

function pickStrongestPositiveMetric(
  comparisons: ComparisonSummary[]
): ComparisonSummary | null {
  const valid = comparisons.filter(
    (item) =>
      item.interpretation === "improved" &&
      typeof item.averageDeltaPercent === "number"
  );

  if (!valid.length) return null;

  return [...valid].sort(
    (a, b) => (b.averageDeltaPercent ?? 0) - (a.averageDeltaPercent ?? 0)
  )[0];
}

function pickBiggestDropMetric(
  comparisons: ComparisonSummary[]
): ComparisonSummary | null {
  const valid = comparisons.filter(
    (item) =>
      item.interpretation === "declined" &&
      typeof item.averageDeltaPercent === "number"
  );

  if (!valid.length) return null;

  return [...valid].sort(
    (a, b) => (a.averageDeltaPercent ?? 0) - (b.averageDeltaPercent ?? 0)
  )[0];
}

function pickMostConsistentMetric(
  rangeMetrics: RangeMetricSummary[]
): RangeMetricSummary | null {
  const valid = rangeMetrics.filter((item) => item.activeDays > 0);
  if (!valid.length) return null;

  return [...valid].sort((a, b) => {
    if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
    return (b.entryCount ?? 0) - (a.entryCount ?? 0);
  })[0];
}

function pickMostRecentMetric(
  rangeMetrics: RangeMetricSummary[]
): RangeMetricSummary | null {
  const valid = rangeMetrics.filter((item) => item.latestRecordedAt);
  if (!valid.length) return null;

  return [...valid].sort((a, b) => {
    return (
      new Date(b.latestRecordedAt ?? 0).getTime() -
      new Date(a.latestRecordedAt ?? 0).getTime()
    );
  })[0];
}

function pickBestMetricToday(
  values: TodayVsYesterdaySummary[]
): TodayVsYesterdaySummary | null {
  const valid = values.filter(
    (item) => typeof item.percentChange === "number" && item.percentChange > 0
  );

  if (!valid.length) return null;

  return [...valid].sort(
    (a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0)
  )[0];
}

export async function buildAthleteAiContext(
  athleteId: string,
  selectedDate?: string
) {
  const athleteObjectId = new mongoose.Types.ObjectId(athleteId);

  const selectedDay = parseSelectedDate(selectedDate);
  const selectedDayStart = startOfUtcDay(selectedDay);
  const selectedDayEnd = endOfUtcDay(selectedDay);

  const yesterdayStart = startOfUtcDay(addUtcDays(selectedDay, -1));
  const yesterdayEnd = endOfUtcDay(addUtcDays(selectedDay, -1));

  const current7dStart = startOfUtcDay(addUtcDays(selectedDay, -6));
  const previous7dStart = startOfUtcDay(addUtcDays(selectedDay, -13));
  const previous7dEnd = endOfUtcDay(addUtcDays(selectedDay, -7));

  const current30dStart = startOfUtcDay(addUtcDays(selectedDay, -29));
  const previous30dStart = startOfUtcDay(addUtcDays(selectedDay, -59));
  const previous30dEnd = endOfUtcDay(addUtcDays(selectedDay, -30));

  const [user, profile, cards] = await Promise.all([
    User.findById(athleteId).select("name email role").lean(),
    AthleteProfile.findOne({ athleteId }).lean(),
    StatCard.find({ athleteId: athleteObjectId }).sort({ order: 1 }).lean(),
  ]);

  const cardIds = cards.map((c: any) => c._id);
  const cardMap = new Map(cards.map((c: any) => [String(c._id), c]));

  const [
    latestEntriesAgg,
    selectedDayEntriesRaw,
    yesterdayEntriesRaw,
    current7dEntriesRaw,
    previous7dEntriesRaw,
    current30dEntriesRaw,
    previous30dEntriesRaw,
    historicalEntriesRaw,
  ] = await Promise.all([
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
        $gte: selectedDayStart,
        $lte: selectedDayEnd,
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: yesterdayStart,
        $lte: yesterdayEnd,
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: current7dStart,
        $lte: selectedDayEnd,
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: previous7dStart,
        $lte: previous7dEnd,
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: current30dStart,
        $lte: selectedDayEnd,
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
      recordedAt: {
        $gte: previous30dStart,
        $lte: previous30dEnd,
      },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
    StatEntry.find({
      athleteId: athleteObjectId,
      cardId: { $in: cardIds },
    })
      .sort({ recordedAt: 1, createdAt: 1 })
      .lean(),
  ]);

  const selectedDayEntries = selectedDayEntriesRaw.map(normalizeEntry);
  const yesterdayEntries = yesterdayEntriesRaw.map(normalizeEntry);
  const current7dEntries = current7dEntriesRaw.map(normalizeEntry);
  const previous7dEntries = previous7dEntriesRaw.map(normalizeEntry);
  const current30dEntries = current30dEntriesRaw.map(normalizeEntry);
  const previous30dEntries = previous30dEntriesRaw.map(normalizeEntry);
  const historicalEntries = historicalEntriesRaw.map(normalizeEntry);

  const latest: LatestMetricEntry[] = latestEntriesAgg
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
        value: typeof item.entry?.value === "number" ? item.entry.value : null,
        secondaryValue:
          typeof item.entry?.secondaryValue === "number"
            ? item.entry.secondaryValue
            : null,
        note: item.entry?.note ?? "",
        recordedAt: item.entry?.recordedAt ?? item.entry?.createdAt ?? null,
      };
    })
    .filter(Boolean) as LatestMetricEntry[];

  const day = buildDayMetricEntries(selectedDayEntries, cardMap);
  const yesterday = buildDayMetricEntries(yesterdayEntries, cardMap);

  const historicalByCard = groupEntriesByCard(historicalEntries);
  const current7dByCard = groupEntriesByCard(current7dEntries);
  const previous7dByCard = groupEntriesByCard(previous7dEntries);
  const current30dByCard = groupEntriesByCard(current30dEntries);
  const previous30dByCard = groupEntriesByCard(previous30dEntries);

  const trends: TrendSummary[] = cards
    .map((card: any) => {
      const entries = (current30dByCard.get(String(card._id)) ?? []).filter(
        (entry) => typeof entry.value === "number"
      );

      const points: TrendPoint[] = entries.map((entry) => ({
        date: entry.recordedAt.toISOString().slice(0, 10),
        value: entry.value as number,
      }));

      const summary = summarizeTrend(points);

      return {
        cardId: String(card._id),
        label: card.label,
        type: card.type,
        unit: card.unit,
        trend: summary.trend,
        firstValue: summary.firstValue,
        lastValue: summary.lastValue,
        delta: summary.delta,
        percentChange: summary.percentChange,
        minValue: min(points.map((point) => point.value)),
        maxValue: max(points.map((point) => point.value)),
        averageValue: average(points.map((point) => point.value)),
        points: points.slice(-10),
      };
    })
    .filter((item) => item.points.length > 0);

  const range7d: RangeMetricSummary[] = cards.map((card: any) =>
    buildRangeSummary(card, current7dByCard.get(String(card._id)) ?? [])
  );

  const rangePrevious7d: RangeMetricSummary[] = cards.map((card: any) =>
    buildRangeSummary(card, previous7dByCard.get(String(card._id)) ?? [])
  );

  const range30d: RangeMetricSummary[] = cards.map((card: any) =>
    buildRangeSummary(card, current30dByCard.get(String(card._id)) ?? [])
  );

  const rangePrevious30d: RangeMetricSummary[] = cards.map((card: any) =>
    buildRangeSummary(card, previous30dByCard.get(String(card._id)) ?? [])
  );

  const weeklyComparison: ComparisonSummary[] = range7d.map((current, index) =>
    buildComparison(current, rangePrevious7d[index])
  );

  const monthlyComparison: ComparisonSummary[] = range30d.map(
    (current, index) => buildComparison(current, rangePrevious30d[index])
  );

  const todayVsYesterday = buildTodayVsYesterday(
    selectedDayEntries,
    yesterdayEntries,
    cardMap
  );

  const bestValues: BestValueSummary[] = cards.map((card: any) =>
    buildBestValueSummary(card, historicalByCard.get(String(card._id)) ?? [])
  );

  const latestWeight =
    latest.find((item) => item.type === "weight")?.value ??
    profile?.currentWeightKg ??
    null;

  const athleteAge = calculateAgeFromBirthDate(profile?.birthDate ?? null);
  const bmi = calculateBmi(profile?.heightCm ?? null, latestWeight);
  const daysUntilEvent = calculateDaysUntil(profile?.eventDate ?? null);

  const weightCard = cards.find((card: any) => card.type === "weight");
  const weightHistory = weightCard
    ? historicalByCard.get(String(weightCard._id)) ?? []
    : [];

  const goalProgress = buildGoalProgress(profile, weightHistory, latestWeight);
  const consistency = buildConsistencySummary(
    current7dEntries,
    current30dEntries
  );

  const performanceSnapshot: PerformanceSnapshot = {
    strongestPositiveMetric: pickStrongestPositiveMetric(monthlyComparison),
    biggestDropMetric: pickBiggestDropMetric(monthlyComparison),
    mostConsistentMetric: pickMostConsistentMetric(range30d),
    mostRecentlyTrackedMetric: pickMostRecentMetric(range30d),
    bestMetricToday: pickBestMetricToday(todayVsYesterday),
  };

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
          ? safeRound(profile.targetWeightKg - latestWeight)
          : null,
      selectedDate: selectedDate || selectedDay.toISOString().slice(0, 10),
      cardCount: cards.length,
      hasAnyStats:
        latest.length > 0 ||
        day.length > 0 ||
        trends.length > 0 ||
        current30dEntries.length > 0,
      trackingStatus:
        current7dEntries.length > 0
          ? "active_last_7d"
          : current30dEntries.length > 0
          ? "active_last_30d"
          : historicalEntries.length > 0
          ? "inactive_recently"
          : "no_data",
    },

    latest,
    day,
    yesterday,
    trends,

    windows: {
      today: {
        date: toDateKey(selectedDayStart),
        entries: day,
      },
      yesterday: {
        date: toDateKey(yesterdayStart),
        entries: yesterday,
      },
      last7Days: {
        start: toDateKey(current7dStart),
        end: toDateKey(selectedDayEnd),
        metrics: range7d,
      },
      previous7Days: {
        start: toDateKey(previous7dStart),
        end: toDateKey(previous7dEnd),
        metrics: rangePrevious7d,
      },
      last30Days: {
        start: toDateKey(current30dStart),
        end: toDateKey(selectedDayEnd),
        metrics: range30d,
      },
      previous30Days: {
        start: toDateKey(previous30dStart),
        end: toDateKey(previous30dEnd),
        metrics: rangePrevious30d,
      },
    },

    comparisons: {
      todayVsYesterday,
      weekly: weeklyComparison,
      monthly: monthlyComparison,
    },

    bestValues,
    goalProgress,
    consistency,
    performanceSnapshot,
  };
}
