import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  useAthleteProfile,
  useCardEntries,
  useCards,
  useLatestStats,
} from "../../hooks/useStats";
import { useTheme } from "../../hooks/useTheme";
import BrandLogo from "../../components/layout/BrandLogo";

type Card = {
  _id: string;
  athleteId: string;
  type: string;
  label: string;
  unit: string;
  color?: string | null;
  chartType?: "line" | "bar" | "mixed" | string;
  visible?: boolean;
  order: number;
  goalEnabled?: boolean;
  goalValue?: number | null;
  goalDirection?: "lose" | "gain" | "min" | "max" | null;
};

type LatestStatItem = {
  card: Card;
  latest: {
    value?: number | null;
    secondaryValue?: number | null;
    recordedAt?: string | null;
    createdAt?: string | null;
  } | null;
};

type TimeRangeKey = "1W" | "1M" | "3M" | "1Y" | "custom";

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: "rose",
  calories: "orange",
  weight: "blue",
  steps: "green",
  sleep: "purple",
  custom: "yellow",
};

const COLOR_HEX: Record<string, string> = {
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
  yellow: "#FFD300",
};

const TIME_RANGES: { key: TimeRangeKey; label: string; days: number }[] = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1J", days: 365 },
  { key: "custom", label: "Frei", days: 0 },
];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function stripEmoji(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, "");
}

function getCardColor(card?: Card): string {
  if (!card) return "#FFD300";
  const key = card.color ?? DEFAULT_COLORS[card.type] ?? "yellow";
  return COLOR_HEX[key] ?? "#FFD300";
}

function getDisplayUnit(unit: string): string {
  if (!unit.startsWith("custom||")) return unit;

  const parts = unit.split("||").slice(1);
  const p1 = parts[0]?.split(":") ?? [];
  const p2 = parts[1]?.split(":") ?? [];
  const u1 = p1[1]?.trim() ?? "";
  const u2 = p2[1]?.trim() ?? "";

  if (u1 && u2) return `${u1} / ${u2}`;
  if (u1) return u1;
  return p1[0]?.trim() || "—";
}

function formatCompactDate(date?: string | null) {
  if (!date) return "—";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatRangeLabel(
  timeRange: TimeRangeKey,
  from: string,
  to: string
): string {
  if (timeRange === "custom") return `${from} – ${to}`;
  return TIME_RANGES.find((r) => r.key === timeRange)?.label ?? "Zeitraum";
}

function calculateTrendLabel(first: number | null, last: number | null) {
  if (typeof first !== "number" || typeof last !== "number") {
    return {
      label: "Zu wenig Daten",
      delta: null as number | null,
      direction: "flat" as "up" | "down" | "flat",
    };
  }

  const delta = Number((last - first).toFixed(2));

  if (delta > 0) {
    return {
      label: "Steigend",
      delta,
      direction: "up" as const,
    };
  }

  if (delta < 0) {
    return {
      label: "Fallend",
      delta,
      direction: "down" as const,
    };
  }

  return {
    label: "Stabil",
    delta: 0,
    direction: "flat" as const,
  };
}

function movingAverage(data: number[], windowSize: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = data.slice(start, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  });
}

function getRangeDates(
  timeRange: TimeRangeKey,
  customFrom: string,
  customTo: string
) {
  if (timeRange === "custom") {
    return { from: customFrom, to: customTo };
  }

  const range = TIME_RANGES.find((r) => r.key === timeRange);
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (range?.days ?? 30));

  return {
    from: toDateStr(fromDate),
    to: toDateStr(toDate),
  };
}

function AnalyzeMetricCard({
  card,
  from,
  to,
  latestValue,
  resolvedTheme,
}: {
  card: Card;
  from: string;
  to: string;
  latestValue?: number | null;
  resolvedTheme: "light" | "dark";
}) {
  const { data: entries = [], isLoading } = useCardEntries(card._id, {
    from,
    to,
  });

  const cardColor = getCardColor(card);
  const displayUnit = getDisplayUnit(card.unit);
  const chartType = card.chartType ?? "line";

  const isPaceCard = card.unit === "min/km";
  const isSpeedCard = card.unit === "km/h";

  const goalActive = Boolean(card.goalEnabled);
  const goalValue = typeof card.goalValue === "number" ? card.goalValue : null;
  const goalDirection =
    card.goalDirection ?? (card.type === "weight" ? "lose" : "min");

  const chartUi = useMemo(() => {
    if (resolvedTheme === "dark") {
      return {
        grid: "rgba(255,255,255,0.05)",
        tick: "#64748b",
        tooltipBg: "#1e1e2e",
        tooltipBorder: `${cardColor}30`,
        tooltipText: "#e2e8f0",
        trend: "rgba(255,255,255,0.45)",
      };
    }

    return {
      grid: "rgba(15,23,42,0.08)",
      tick: "#6b7280",
      tooltipBg: "#ffffff",
      tooltipBorder: `${cardColor}35`,
      tooltipText: "#111827",
      trend: "rgba(15,23,42,0.35)",
    };
  }, [resolvedTheme, cardColor]);

  const rawData = (entries ?? []).map((e: any) => {
    let value = e.value;

    if (isPaceCard && e.secondaryValue && e.value) {
      value = +(e.secondaryValue / e.value).toFixed(2);
    }

    if (isSpeedCard && e.secondaryValue && e.value) {
      value = +(e.value / (e.secondaryValue / 60)).toFixed(1);
    }

    return {
      date: new Date(e.recordedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
      }),
      dateISO: toDateStr(new Date(e.recordedAt)),
      value,
      _real: value,
      recordedAt: e.recordedAt,
    };
  });

  const numericValues = rawData
    .map((d) => d.value)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const maxVal = numericValues.length ? Math.max(...numericValues) : null;
  const minVal = numericValues.length ? Math.min(...numericValues) : null;
  const avgVal = numericValues.length
    ? Number(
        (
          numericValues.reduce((sum, value) => sum + value, 0) /
          numericValues.length
        ).toFixed(2)
      )
    : null;
  const firstVal = numericValues.length ? numericValues[0] : null;
  const lastVal = numericValues.length
    ? numericValues[numericValues.length - 1]
    : null;

  const trend = calculateTrendLabel(firstVal, lastVal);

  const trendValues = movingAverage(
    rawData.map((d) => d.value),
    Math.min(7, Math.max(1, rawData.length))
  );

  const chartData = rawData.map((d, i) => ({
    ...d,
    trend: trendValues[i],
  }));

  const goalMet =
    goalActive && typeof goalValue === "number"
      ? rawData.filter((d) => {
          if (goalDirection === "gain" || goalDirection === "min") {
            return d._real >= goalValue;
          }
          return d._real <= goalValue;
        }).length
      : 0;

  const goalPct =
    goalActive && rawData.length > 0
      ? Math.round((goalMet / rawData.length) * 100)
      : 0;

  const goalDirectionLabel =
    goalDirection === "lose"
      ? "Abnehmen"
      : goalDirection === "gain"
      ? "Zunehmen"
      : goalDirection === "max"
      ? "Obergrenze"
      : "Mindestziel";

  return (
    <div className="overflow-hidden rounded-3xl border border-subtle bg-surface">
      <div className="border-b border-subtle px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: cardColor }}
              />
              <h3 className="truncate text-base font-semibold text-primary">
                {stripEmoji(card.label)}
              </h3>
            </div>

            <p className="mt-1 text-xs text-muted">
              {displayUnit} · {card.type}
            </p>
          </div>

          <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Letzter Wert
            </p>
            <p className="text-sm font-semibold text-primary">
              {typeof latestValue === "number"
                ? `${latestValue} ${displayUnit}`
                : "—"}
            </p>
            {goalActive && typeof goalValue === "number" && (
              <p className="mt-1 text-[10px] text-[#c99700] dark:text-[#FFD300]/80">
                Ziel: {goalValue} {displayUnit}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-subtle px-4 py-4 sm:grid-cols-4 sm:px-5">
        <div className="rounded-2xl border border-subtle bg-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            Trend
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              trend.direction === "up"
                ? "text-emerald-500"
                : trend.direction === "down"
                ? "text-rose-500"
                : "text-primary"
            }`}
          >
            {trend.label}
          </p>
          <p className="mt-1 text-xs text-muted">
            {trend.delta === null
              ? "—"
              : `${trend.delta > 0 ? "+" : ""}${trend.delta} ${displayUnit}`}
          </p>
        </div>

        <div className="rounded-2xl border border-subtle bg-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            Einträge
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {rawData.length}
          </p>
          <p className="mt-1 text-xs text-muted">im gewählten Zeitraum</p>
        </div>

        <div className="rounded-2xl border border-subtle bg-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            Durchschnitt
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {typeof avgVal === "number" ? avgVal : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">{displayUnit}</p>
        </div>

        <div className="rounded-2xl border border-subtle bg-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
            {goalActive ? "Zielstatus" : "Min / Max"}
          </p>
          {goalActive && typeof goalValue === "number" ? (
            <>
              <p className="mt-1 text-sm font-semibold text-primary">
                {goalPct}% erreicht
              </p>
              <p className="mt-1 text-xs text-muted">
                {goalMet} von {rawData.length} Einträgen · {goalDirectionLabel}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-primary">
                {typeof minVal === "number" ? minVal : "—"} /{" "}
                {typeof maxVal === "number" ? maxVal : "—"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Letzter Eintrag:{" "}
                {rawData.length
                  ? formatCompactDate(rawData[rawData.length - 1]?.recordedAt)
                  : "—"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{
                borderColor: `${cardColor}40`,
                borderTopColor: cardColor,
              }}
            />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-subtle bg-surface-2">
            <p className="text-sm text-muted">
              Keine Daten im gewählten Zeitraum
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />

              <XAxis
                dataKey="date"
                tick={{ fill: chartUi.tick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                tick={{ fill: chartUi.tick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />

              <Tooltip
                contentStyle={{
                  background: chartUi.tooltipBg,
                  border: `1px solid ${chartUi.tooltipBorder}`,
                  borderRadius: "12px",
                  color: chartUi.tooltipText,
                  fontSize: "13px",
                }}
                formatter={(v: any, name: any, props: any) => {
                  if (name === "trend") return [`${v} ${displayUnit}`, "Trend"];

                  return [
                    <span style={{ color: cardColor }}>
                      {props.payload._real} {displayUnit}
                    </span>,
                    stripEmoji(card.label),
                  ];
                }}
              />

              {chartData.length > 0 && (
                <ReferenceLine
                  x={chartData[chartData.length - 1]?.date}
                  stroke={cardColor}
                  strokeWidth={1.5}
                  strokeOpacity={0.65}
                  strokeDasharray="4 3"
                />
              )}

              {goalActive && typeof goalValue === "number" && (
                <ReferenceLine
                  y={goalValue}
                  stroke="#FFD300"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  strokeOpacity={0.9}
                  label={{
                    value: `Ziel: ${goalValue} ${displayUnit}`,
                    position: "insideTopRight",
                    fill: "#FFD300",
                    fontSize: 10,
                  }}
                />
              )}

              {(chartType === "bar" || chartType === "mixed") && (
                <Bar
                  dataKey="value"
                  fill={cardColor}
                  fillOpacity={chartType === "mixed" ? 0.28 : 0.72}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              )}

              {(chartType === "line" || chartType === "mixed") && (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={cardColor}
                  strokeWidth={2}
                  dot={
                    goalActive && typeof goalValue === "number"
                      ? (props: any) => {
                          const { cx, cy, payload } = props;
                          const met =
                            goalDirection === "gain" || goalDirection === "min"
                              ? payload._real >= goalValue
                              : payload._real <= goalValue;

                          return (
                            <circle
                              key={`dot-${cx}-${cy}`}
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill={met ? "#ffffff" : cardColor}
                            />
                          );
                        }
                      : false
                  }
                  activeDot={{ r: 5, fill: cardColor }}
                />
              )}

              <Line
                type="monotone"
                dataKey="trend"
                stroke={chartUi.trend}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function AthleteAnalyzePage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: latestStats = [] } = useLatestStats() as {
    data: LatestStatItem[];
  };
  const { data: profile } = useAthleteProfile() as {
    data: any;
  };

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("1M");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toDateStr(d);
  });
  const [customTo, setCustomTo] = useState<string>(toDateStr(new Date()));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { from, to } = useMemo(
    () => getRangeDates(timeRange, customFrom, customTo),
    [timeRange, customFrom, customTo]
  );

  const latestMap = useMemo(() => {
    const map = new Map<string, number | null>();

    for (const item of latestStats ?? []) {
      map.set(item.card._id, item.latest?.value ?? null);
    }

    return map;
  }, [latestStats]);

  const visibleCards = useMemo(() => {
    return [...cards]
      .filter((card) => card.visible !== false)
      .sort((a, b) => a.order - b.order);
  }, [cards]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(visibleCards.map((card) => card.type))).sort();
  }, [visibleCards]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visibleCards.filter((card) => {
      const matchesType = typeFilter === "all" || card.type === typeFilter;
      const matchesSearch =
        !q ||
        stripEmoji(card.label).toLowerCase().includes(q) ||
        card.type.toLowerCase().includes(q) ||
        card.unit.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [visibleCards, typeFilter, search]);

  const kpis = useMemo(() => {
    const trackedMetrics = visibleCards.length;
    const latestAvailable = latestStats.filter(
      (item) => item.latest?.value != null
    ).length;
    const weightLatest =
      latestStats.find((item) => item.card.type === "weight")?.latest?.value ??
      profile?.currentWeightKg ??
      null;

    return {
      trackedMetrics,
      latestAvailable,
      weightLatest,
      goal: profile?.primaryGoal ?? "—",
    };
  }, [visibleCards, latestStats, profile]);

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-subtle px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/athlete")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-surface text-secondary transition-all hover:border-strong hover:bg-surface-2 hover:text-primary"
              title="Zurück"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <BrandLogo showText={false} imageClassName="h-8 w-auto" />

            <div>
              <h1 className="text-lg font-semibold text-primary">
                Analyse-Dashboard
              </h1>
              <p className="text-xs text-muted">
                Alle Metriken im Überblick mit eigenem Verlauf
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-subtle bg-surface px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Zeitraum
            </p>
            <p className="text-sm font-medium text-primary">
              {formatRangeLabel(timeRange, from, to)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-subtle bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Sichtbare Metriken
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {kpis.trackedMetrics}
            </p>
            <p className="mt-1 text-xs text-muted">aktive Analyse-Karten</p>
          </div>

          <div className="rounded-2xl border border-subtle bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Letzte Werte
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {kpis.latestAvailable}
            </p>
            <p className="mt-1 text-xs text-muted">mit aktuellen Einträgen</p>
          </div>

          <div className="rounded-2xl border border-subtle bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Aktuelles Gewicht
            </p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {typeof kpis.weightLatest === "number"
                ? `${kpis.weightLatest} kg`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted">
              aus Profil oder letztem Eintrag
            </p>
          </div>

          <div className="rounded-2xl border border-subtle bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Primäres Ziel
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-primary">
              {String(kpis.goal).replaceAll("_", " ")}
            </p>
            <p className="mt-1 text-xs text-muted">laut aktuellem Profil</p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-subtle bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted">
                Suche
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nach Metrik, Typ oder Einheit suchen..."
                className="w-full rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
              />
            </div>

            <div className="xl:min-w-[420px]">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted">
                Zeitraum
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => setTimeRange(range.key)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      timeRange === range.key
                        ? "border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]"
                        : "border-subtle bg-surface-2 text-secondary hover:border-strong hover:text-primary"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {timeRange === "custom" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-subtle bg-surface-2 px-3 py-2 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
              />
              <span className="text-sm text-muted">bis</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-subtle bg-surface-2 px-3 py-2 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
              />
            </div>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Typ filtern
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                  typeFilter === "all"
                    ? "border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]"
                    : "border-subtle bg-surface-2 text-secondary hover:border-strong hover:text-primary"
                }`}
              >
                Alle
              </button>

              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-all ${
                    typeFilter === type
                      ? "border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]"
                      : "border-subtle bg-surface-2 text-secondary hover:border-strong hover:text-primary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {cardsLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-3xl border border-subtle bg-surface"
              />
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-subtle bg-surface p-12 text-center">
            <p className="text-sm text-muted">
              Keine Analyse-Karten für die aktuelle Suche oder den gewählten
              Filter gefunden.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCards.map((card) => (
              <AnalyzeMetricCard
                key={card._id}
                card={card}
                from={from}
                to={to}
                latestValue={latestMap.get(card._id) ?? null}
                resolvedTheme={resolvedTheme}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
