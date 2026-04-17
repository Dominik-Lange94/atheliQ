export type BetterDirection = "higher" | "lower";
export type GoalMode = "at_least" | "at_most";

export type TrendDirection = "up" | "down" | "flat";
export type TrendPerformance = "better" | "worse" | "neutral";

export type LegacyGoalDirection = "lose" | "gain" | "min" | "max";

export type MetricCardLike = {
  type?: string | null;
  unit?: string | null;
  goalEnabled?: boolean | null;
  goalValue?: number | null;
  goalDirection?: LegacyGoalDirection | null;
};

export type MetricEntryLike = {
  value?: number | null;
  secondaryValue?: number | null;
  recordedAt?: string | null;
};

export type MetricDefinition = {
  key: string;
  invertYAxis: boolean;
  betterDirection: BetterDirection;
  decimals: number;
  defaultGoalMode?: GoalMode;
  deriveValue?: (entry: MetricEntryLike) => number | null;
};

export type NormalizedMetricPoint = {
  recordedAt: string | null;
  rawValue: number | null;
  displayValue: number | null;
  chartValue: number | null;
};

export type TrendResult = {
  label: string;
  delta: number | null;
  direction: TrendDirection;
  performance: TrendPerformance;
};

export type ChartValueRange = {
  min: number | null;
  max: number | null;
};

export type BuildChartPointResult = {
  recordedAt: string | null;
  date: string;
  dateISO: string;
  rawValue: number | null;
  displayValue: number | null;
  chartValue: number | null;
};

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  heartrate: {
    key: "heartrate",
    betterDirection: "lower",
    invertYAxis: false,
    decimals: 0,
    defaultGoalMode: "at_most",
  },

  calories: {
    key: "calories",
    betterDirection: "higher",
    invertYAxis: false,
    decimals: 0,
    defaultGoalMode: "at_least",
  },

  weight: {
    key: "weight",
    betterDirection: "lower",
    invertYAxis: false,
    decimals: 1,
    defaultGoalMode: "at_most",
  },

  steps: {
    key: "steps",
    betterDirection: "higher",
    invertYAxis: false,
    decimals: 0,
    defaultGoalMode: "at_least",
  },

  sleep: {
    key: "sleep",
    betterDirection: "higher",
    invertYAxis: false,
    decimals: 2,
    defaultGoalMode: "at_least",
  },

  pace: {
    key: "pace",
    betterDirection: "lower",
    invertYAxis: true,
    decimals: 2,
    defaultGoalMode: "at_most",
    deriveValue: (entry) => {
      const distanceKm = toFiniteNumber(entry.value);
      const durationMin = toFiniteNumber(entry.secondaryValue);

      if (
        typeof distanceKm !== "number" ||
        typeof durationMin !== "number" ||
        distanceKm <= 0
      ) {
        return null;
      }

      return roundNumber(durationMin / distanceKm, 2);
    },
  },

  speed: {
    key: "speed",
    betterDirection: "higher",
    invertYAxis: false,
    decimals: 1,
    defaultGoalMode: "at_least",
    deriveValue: (entry) => {
      const distanceKm = toFiniteNumber(entry.value);
      const durationMin = toFiniteNumber(entry.secondaryValue);

      if (
        typeof distanceKm !== "number" ||
        typeof durationMin !== "number" ||
        durationMin <= 0
      ) {
        return null;
      }

      return roundNumber(distanceKm / (durationMin / 60), 1);
    },
  },

  custom: {
    key: "custom",
    betterDirection: "higher",
    invertYAxis: false,
    decimals: 2,
    defaultGoalMode: "at_least",
  },
};

export function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function roundNumber(
  value: number | null | undefined,
  decimals = 2
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

export function formatMetricNumber(
  value: number | null | undefined,
  decimals = 2
): number | null {
  return roundNumber(value, decimals);
}

export function resolveMetricDefinition(
  card?: Pick<MetricCardLike, "type" | "unit"> | null
): MetricDefinition {
  const unit = card?.unit ?? null;
  const type = card?.type ?? null;

  if (unit === "min/km") return METRIC_DEFINITIONS.pace;
  if (unit === "km/h") return METRIC_DEFINITIONS.speed;

  if (type && METRIC_DEFINITIONS[type]) {
    return METRIC_DEFINITIONS[type];
  }

  return METRIC_DEFINITIONS.custom;
}

/**
 * Wichtig:
 * - gain / lose bleiben eindeutig
 * - min / max werden anhand der Metrik-Semantik interpretiert
 *
 * Beispiel:
 * - Schritte + min => at_least
 * - Pace + min => at_most
 */
export function resolveGoalMode(card?: MetricCardLike | null): GoalMode {
  const metric = resolveMetricDefinition(card);

  switch (card?.goalDirection) {
    case "gain":
      return "at_least";
    case "lose":
      return "at_most";

    case "min":
      return metric.betterDirection === "lower" ? "at_most" : "at_least";

    case "max":
      return metric.betterDirection === "lower" ? "at_least" : "at_most";

    default:
      return (
        metric.defaultGoalMode ??
        (metric.betterDirection === "lower" ? "at_most" : "at_least")
      );
  }
}

export function normalizeMetricEntry(
  card: MetricCardLike | null | undefined,
  entry: MetricEntryLike
): NormalizedMetricPoint {
  const metric = resolveMetricDefinition(card);

  const derivedValue = metric.deriveValue
    ? metric.deriveValue(entry)
    : toFiniteNumber(entry.value);

  const rawValue = roundNumber(derivedValue, metric.decimals);
  const displayValue = roundNumber(rawValue, metric.decimals);

  return {
    recordedAt: entry.recordedAt ?? null,
    rawValue,
    displayValue,
    chartValue: rawValue,
  };
}

export function normalizeMetricEntries(
  card: MetricCardLike | null | undefined,
  entries: MetricEntryLike[]
): NormalizedMetricPoint[] {
  return (entries ?? []).map((entry) => normalizeMetricEntry(card, entry));
}

export function isLowerBetterMetric(
  card?: Pick<MetricCardLike, "type" | "unit"> | null
): boolean {
  return resolveMetricDefinition(card).betterDirection === "lower";
}

export function isHigherBetterMetric(
  card?: Pick<MetricCardLike, "type" | "unit"> | null
): boolean {
  return resolveMetricDefinition(card).betterDirection === "higher";
}

export function shouldInvertYAxis(
  card?: Pick<MetricCardLike, "type" | "unit"> | null
): boolean {
  return resolveMetricDefinition(card).invertYAxis;
}

export function isGoalReached(params: {
  value: number | null | undefined;
  goalValue: number | null | undefined;
  goalMode: GoalMode;
}): boolean {
  const { value, goalValue, goalMode } = params;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    typeof goalValue !== "number" ||
    !Number.isFinite(goalValue)
  ) {
    return false;
  }

  return goalMode === "at_least" ? value >= goalValue : value <= goalValue;
}

export function isGoalReachedForCard(params: {
  card: MetricCardLike | null | undefined;
  value: number | null | undefined;
  goalValue?: number | null | undefined;
}): boolean {
  const { card, value } = params;
  const goalValue =
    typeof params.goalValue === "number"
      ? params.goalValue
      : toFiniteNumber(card?.goalValue);

  return isGoalReached({
    value,
    goalValue,
    goalMode: resolveGoalMode(card),
  });
}

export function getGoalGap(params: {
  value: number | null | undefined;
  goalValue: number | null | undefined;
  goalMode: GoalMode;
  decimals?: number;
}): number | null {
  const { value, goalValue, goalMode, decimals = 2 } = params;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    typeof goalValue !== "number" ||
    !Number.isFinite(goalValue)
  ) {
    return null;
  }

  const gap =
    goalMode === "at_least"
      ? Math.max(0, goalValue - value)
      : Math.max(0, value - goalValue);

  return roundNumber(gap, decimals);
}

export function getGoalGapForCard(params: {
  card: MetricCardLike | null | undefined;
  value: number | null | undefined;
  goalValue?: number | null | undefined;
}): number | null {
  const { card, value } = params;
  const metric = resolveMetricDefinition(card);
  const goalValue =
    typeof params.goalValue === "number"
      ? params.goalValue
      : toFiniteNumber(card?.goalValue);

  return getGoalGap({
    value,
    goalValue,
    goalMode: resolveGoalMode(card),
    decimals: metric.decimals,
  });
}

export function getGoalStats(params: {
  card: MetricCardLike | null | undefined;
  values: Array<number | null | undefined>;
  goalValue?: number | null | undefined;
}): {
  total: number;
  reached: number;
  remaining: number;
  percent: number;
} {
  const { card, values } = params;
  const goalValue =
    typeof params.goalValue === "number"
      ? params.goalValue
      : toFiniteNumber(card?.goalValue);

  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );

  if (
    !validValues.length ||
    typeof goalValue !== "number" ||
    !Number.isFinite(goalValue)
  ) {
    return {
      total: validValues.length,
      reached: 0,
      remaining: validValues.length,
      percent: 0,
    };
  }

  const goalMode = resolveGoalMode(card);
  const reached = validValues.filter((value) =>
    isGoalReached({ value, goalValue, goalMode })
  ).length;
  const total = validValues.length;
  const remaining = Math.max(0, total - reached);
  const percent = total > 0 ? Math.round((reached / total) * 100) : 0;

  return {
    total,
    reached,
    remaining,
    percent,
  };
}

/**
 * direction = numerische Richtung
 * performance = gut/schlecht laut Metrik
 * label = numerische Richtung
 */
export function getTrend(params: {
  first: number | null | undefined;
  last: number | null | undefined;
  betterDirection: BetterDirection;
  decimals?: number;
}): TrendResult {
  const { first, last, betterDirection, decimals = 2 } = params;

  if (
    typeof first !== "number" ||
    !Number.isFinite(first) ||
    typeof last !== "number" ||
    !Number.isFinite(last)
  ) {
    return {
      label: "Zu wenig Daten",
      delta: null,
      direction: "flat",
      performance: "neutral",
    };
  }

  const delta = roundNumber(last - first, decimals);

  if (delta === null || delta === 0) {
    return {
      label: "Stabil",
      delta: 0,
      direction: "flat",
      performance: "neutral",
    };
  }

  const direction: TrendDirection = delta > 0 ? "up" : "down";
  const improved = betterDirection === "lower" ? delta < 0 : delta > 0;

  return {
    label: direction === "up" ? "Steigend" : "Fallend",
    delta,
    direction,
    performance: improved ? "better" : "worse",
  };
}

export function getTrendForCard(params: {
  card: MetricCardLike | null | undefined;
  first: number | null | undefined;
  last: number | null | undefined;
}): TrendResult {
  const metric = resolveMetricDefinition(params.card);

  return getTrend({
    first: params.first,
    last: params.last,
    betterDirection: metric.betterDirection,
    decimals: metric.decimals,
  });
}

export function getMetricInsight(params: {
  card: MetricCardLike | null | undefined;
  first: number | null | undefined;
  last: number | null | undefined;
}):
  | { text: "Ziel erreicht"; color: "emerald" }
  | { text: "Verbesserung"; color: "emerald" }
  | { text: "Verschlechterung"; color: "rose" }
  | { text: "Stabil"; color: "gray" }
  | null {
  const { card, last } = params;

  if (typeof last !== "number" || !Number.isFinite(last)) {
    return null;
  }

  const goalValue = toFiniteNumber(card?.goalValue);
  const goalEnabled = Boolean(card?.goalEnabled);

  if (goalEnabled && goalValue !== null) {
    const reached = isGoalReachedForCard({
      card,
      value: last,
      goalValue,
    });

    if (reached) {
      return { text: "Ziel erreicht", color: "emerald" };
    }
  }

  const trend = getTrendForCard(params);

  if (trend.performance === "better") {
    return { text: "Verbesserung", color: "emerald" };
  }

  if (trend.performance === "worse") {
    return { text: "Verschlechterung", color: "rose" };
  }

  return { text: "Stabil", color: "gray" };
}

export function getMinValue(
  values: Array<number | null | undefined>
): number | null {
  const numeric = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
  return numeric.length ? Math.min(...numeric) : null;
}

export function getMaxValue(
  values: Array<number | null | undefined>
): number | null {
  const numeric = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
  return numeric.length ? Math.max(...numeric) : null;
}

export function getAverageValue(
  values: Array<number | null | undefined>,
  decimals = 2
): number | null {
  const numeric = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );

  if (!numeric.length) return null;

  return roundNumber(
    numeric.reduce((sum, value) => sum + value, 0) / numeric.length,
    decimals
  );
}

export function getFirstValue(
  values: Array<number | null | undefined>
): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function getLastValue(
  values: Array<number | null | undefined>
): number | null {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function movingAverageValues(
  values: Array<number | null | undefined>,
  windowSize: number,
  decimals = 2
): Array<number | null> {
  const safeWindowSize = Math.max(1, Math.floor(windowSize || 1));

  return values.map((_, index) => {
    const start = Math.max(0, index - safeWindowSize + 1);
    const slice = values
      .slice(start, index + 1)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value)
      );

    if (!slice.length) return null;

    return roundNumber(
      slice.reduce((sum, value) => sum + value, 0) / slice.length,
      decimals
    );
  });
}

export function movingAverage(
  values: Array<number | null | undefined>,
  windowSize: number,
  decimals = 2
): Array<number | null> {
  return movingAverageValues(values, windowSize, decimals);
}

export function getValueRange(
  values: Array<number | null | undefined>
): ChartValueRange {
  return {
    min: getMinValue(values),
    max: getMaxValue(values),
  };
}

/**
 * Aktuell absichtlich ohne visuelle Invertierung.
 * Dadurch bleiben:
 * - Linie
 * - Balken
 * - Y-Achse
 * - Goal-Line
 * konsistent.
 */
export function transformChartValue(params: {
  card: MetricCardLike | null | undefined;
  value: number | null | undefined;
  range?: ChartValueRange | null;
}): number | null {
  const numericValue = toFiniteNumber(params.value);
  if (numericValue === null) return null;

  const metric = resolveMetricDefinition(params.card);

  if (!metric.invertYAxis) {
    return numericValue;
  }

  const min = params.range?.min;
  const max = params.range?.max;

  if (
    typeof min !== "number" ||
    !Number.isFinite(min) ||
    typeof max !== "number" ||
    !Number.isFinite(max)
  ) {
    return numericValue;
  }

  return roundNumber(max + min - numericValue, metric.decimals);
}

export function getChartGoalValue(params: {
  card: MetricCardLike | null | undefined;
  goalValue?: number | null | undefined;
  range?: ChartValueRange | null;
}): number | null {
  const goalValue =
    typeof params.goalValue === "number"
      ? params.goalValue
      : toFiniteNumber(params.card?.goalValue);

  return transformChartValue({
    card: params.card,
    value: goalValue,
    range: params.range,
  });
}

export function buildChartPoints(params: {
  card: MetricCardLike | null | undefined;
  entries: MetricEntryLike[];
  labelFormatter?: (recordedAt: Date) => string;
  isoFormatter?: (recordedAt: Date) => string;
  applyChartTransform?: boolean;
}): BuildChartPointResult[] {
  const { card, entries, labelFormatter, isoFormatter } = params;
  const normalized = normalizeMetricEntries(card, entries);
  const rawValues = normalized.map((point) => point.rawValue);
  const range = getValueRange(rawValues);
  const applyChartTransform = params.applyChartTransform ?? true;

  return normalized.map((point) => {
    const parsedDate = point.recordedAt ? new Date(point.recordedAt) : null;
    const isValidDate =
      parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime());

    return {
      recordedAt: point.recordedAt,
      date: isValidDate
        ? labelFormatter
          ? labelFormatter(parsedDate)
          : parsedDate.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "short",
            })
        : "—",
      dateISO: isValidDate
        ? isoFormatter
          ? isoFormatter(parsedDate)
          : parsedDate.toISOString().split("T")[0]
        : "",
      rawValue: point.rawValue,
      displayValue: point.displayValue,
      chartValue: applyChartTransform
        ? transformChartValue({
            card,
            value: point.rawValue,
            range,
          })
        : point.rawValue,
    };
  });
}

export function getMetricSummary(params: {
  card: MetricCardLike | null | undefined;
  values: Array<number | null | undefined>;
}): {
  first: number | null;
  last: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  trend: TrendResult;
  goal: {
    total: number;
    reached: number;
    remaining: number;
    percent: number;
  };
  insight:
    | { text: "Ziel erreicht"; color: "emerald" }
    | { text: "Verbesserung"; color: "emerald" }
    | { text: "Verschlechterung"; color: "rose" }
    | { text: "Stabil"; color: "gray" }
    | null;
} {
  const { card, values } = params;
  const metric = resolveMetricDefinition(card);

  const first = getFirstValue(values);
  const last = getLastValue(values);
  const min = getMinValue(values);
  const max = getMaxValue(values);
  const avg = getAverageValue(values, metric.decimals);
  const trend = getTrendForCard({ card, first, last });
  const goal = getGoalStats({ card, values });
  const insight = getMetricInsight({ card, first, last });

  return {
    first,
    last,
    min,
    max,
    avg,
    trend,
    goal,
    insight,
  };
}
