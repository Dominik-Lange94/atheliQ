import { useState, useMemo } from "react";
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
import { useCardEntries } from "../../hooks/useStats";
import { useTheme } from "../../hooks/useTheme";

interface Card {
  _id: string;
  label: string;
  unit: string;
  type: string;
  chartType?: string;
  color?: string;
}

interface Props {
  cards: Card[];
  selectedCardIds: string[];
  selectedDate?: string;
}

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

const TIME_RANGES = [
  { key: "1D", label: "1T", days: 1 },
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1J", days: 365 },
  { key: "custom", label: "Frei", days: 0 },
];

function getCardColor(card?: Card): string {
  if (!card) return "#FFD300";
  const key = card.color ?? DEFAULT_COLORS[card.type] ?? "yellow";
  return COLOR_HEX[key] ?? "#FFD300";
}

function stripEmoji(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, "");
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

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function movingAverage(data: number[], windowSize: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = data.slice(start, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  });
}

export default function MainChart({
  cards,
  selectedCardIds,
  selectedDate,
}: Props) {
  const { resolvedTheme } = useTheme();

  const selectedCards = cards.filter((c) => selectedCardIds.includes(c._id));

  const [activeCardId, setActiveCardId] = useState<string>("");
  const [weightGoal, setWeightGoal] = useState<"lose" | "gain">("lose");
  const [timeRange, setTimeRange] = useState<string>("1M");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toDateStr(d);
  });
  const [customTo, setCustomTo] = useState<string>(toDateStr(new Date()));

  const [goalActive, setGoalActive] = useState(false);
  const [goalValue, setGoalValue] = useState<number>(0);

  const [trendActive, setTrendActive] = useState(false);
  const [trendWindow, setTrendWindow] = useState<number>(7);

  const displayCard =
    selectedCards.find((c) => c._id === activeCardId) ?? selectedCards[0];
  const cardColor = getCardColor(displayCard);

  const chartUi = useMemo(() => {
    if (resolvedTheme === "dark") {
      return {
        grid: "rgba(255,255,255,0.05)",
        tick: "#64748b",
        tooltipBg: "#1e1e2e",
        tooltipBorder: `${cardColor}30`,
        tooltipText: "#e2e8f0",
        trend: "rgba(255,255,255,0.45)",
        mutedLine: "#64748b",
        sliderRest: "rgba(255,255,255,0.10)",
      };
    }

    return {
      grid: "rgba(15,23,42,0.08)",
      tick: "#6b7280",
      tooltipBg: "#ffffff",
      tooltipBorder: `${cardColor}35`,
      tooltipText: "#111827",
      trend: "rgba(15,23,42,0.35)",
      mutedLine: "#94a3b8",
      sliderRest: "rgba(15,23,42,0.10)",
    };
  }, [resolvedTheme, cardColor]);

  const { from, to } = useMemo(() => {
    if (timeRange === "custom") return { from: customFrom, to: customTo };

    const range = TIME_RANGES.find((r) => r.key === timeRange);
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (range?.days ?? 30));

    return { from: toDateStr(fromDate), to: toDateStr(toDate) };
  }, [timeRange, customFrom, customTo]);

  const { data: entries, isLoading } = useCardEntries(
    displayCard?._id ?? null,
    {
      from,
      to,
    }
  );

  if (!selectedCards.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-subtle bg-surface p-8">
        <p className="text-sm text-muted">
          Karten unten auswählen, um sie im Diagramm anzuzeigen
        </p>
      </div>
    );
  }

  const isPaceCard = displayCard?.unit === "min/km";
  const isSpeedCard = displayCard?.unit === "km/h";
  const isWeightCard = displayCard?.unit === "kg";
  const chartType = displayCard?.chartType ?? "line";
  const displayUnit = getDisplayUnit(displayCard?.unit ?? "");

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
    };
  });

  const maxVal = rawData.length
    ? Math.max(...rawData.map((d) => d.value))
    : 100;
  const minVal = rawData.length ? Math.min(...rawData.map((d) => d.value)) : 0;

  const shouldInvert = isPaceCard;
  const displayData = shouldInvert
    ? rawData.map((d) => ({
        ...d,
        value: +(maxVal + minVal - d.value).toFixed(2),
      }))
    : rawData;

  const trendValues = trendActive
    ? movingAverage(
        displayData.map((d) => d.value),
        Math.min(trendWindow, displayData.length)
      )
    : [];

  const chartData = displayData.map((d, i) => ({
    ...d,
    trend: trendActive ? trendValues[i] : undefined,
  }));

  const selectedDateLabel = selectedDate
    ? chartData.find((d) => d.dateISO === selectedDate)?.date
    : null;

  const goalDisplayValue = shouldInvert
    ? maxVal + minVal - goalValue
    : goalValue;

  const sliderMin = Math.floor(minVal * 0.9);
  const sliderMax = Math.ceil(maxVal * 1.1);
  const sliderStep =
    sliderMax - sliderMin > 100
      ? Math.round((sliderMax - sliderMin) / 100)
      : 0.1;

  const goalMet = rawData.filter((d) =>
    weightGoal === "gain" ? d.value >= goalValue : d.value <= goalValue
  ).length;
  const goalPct =
    rawData.length > 0 ? Math.round((goalMet / rawData.length) * 100) : 0;

  const rangeLabel =
    timeRange === "custom"
      ? `${customFrom} – ${customTo}`
      : TIME_RANGES.find((r) => r.key === timeRange)?.label;

  return (
    <div className="rounded-2xl border border-subtle bg-surface p-5">
      {selectedCards.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedCards.map((card) => {
            const isActive = displayCard?._id === card._id;
            const hex = getCardColor(card);

            return (
              <button
                key={card._id}
                onClick={() => setActiveCardId(card._id)}
                style={
                  isActive
                    ? {
                        borderColor: `${hex}50`,
                        backgroundColor: `${hex}15`,
                        color: hex,
                      }
                    : {}
                }
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? ""
                    : "border-subtle bg-surface-2 text-muted hover:border-strong hover:text-primary"
                }`}
              >
                {stripEmoji(card.label)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-primary">
            {stripEmoji(displayCard?.label ?? "")}
          </h2>
          <p className="text-xs text-muted">
            {displayUnit} · {rangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isWeightCard && (
            <div className="flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 p-1">
              <button
                onClick={() => setWeightGoal("lose")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  weightGoal === "lose"
                    ? "bg-[#FFD300] text-[#0f0f13]"
                    : "text-muted hover:text-primary"
                }`}
              >
                📉 Abnehmen
              </button>
              <button
                onClick={() => setWeightGoal("gain")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  weightGoal === "gain"
                    ? "bg-[#FFD300] text-[#0f0f13]"
                    : "text-muted hover:text-primary"
                }`}
              >
                📈 Zunehmen
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setTimeRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  timeRange === r.key
                    ? "bg-[#FFD300] text-[#0f0f13]"
                    : "text-muted hover:text-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {timeRange === "custom" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-primary focus:border-[#FFD300]/50 focus:outline-none"
          />
          <span className="text-xs text-muted">bis</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-primary focus:border-[#FFD300]/50 focus:outline-none"
          />
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setGoalActive((v) => !v);
              if (!goalActive) setGoalValue(Math.round((maxVal + minVal) / 2));
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              goalActive
                ? "border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]"
                : "border-subtle text-muted hover:border-strong hover:text-primary"
            }`}
          >
            <span
              className="inline-block w-4 border-t-2 border-dashed"
              style={{
                borderColor: goalActive ? "#FFD300" : chartUi.mutedLine,
              }}
            />
            Ziel
          </button>

          <button
            onClick={() => setTrendActive((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              trendActive
                ? "border-strong bg-surface-2 text-primary"
                : "border-subtle text-muted hover:border-strong hover:text-primary"
            }`}
          >
            <span
              className="inline-block h-0.5 w-4 rounded-full"
              style={{
                backgroundColor: trendActive
                  ? chartUi.trend
                  : chartUi.mutedLine,
              }}
            />
            Trendlinie
          </button>

          {trendActive && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Glättung</span>
              <div className="flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-2 p-0.5">
                {[3, 5, 7, 14].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTrendWindow(n)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                      trendWindow === n
                        ? "bg-surface-3 text-primary"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {goalActive && !isLoading && chartData.length > 0 && (
        <div className="mb-4 px-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-muted">Zielwert</span>
            <span className="text-xs font-medium text-[#FFD300]">
              {goalValue} {displayUnit}
            </span>
          </div>

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={goalValue}
            onChange={(e) => setGoalValue(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#FFD300]"
            style={{
              background: `linear-gradient(to right, #FFD300 0%, #FFD300 ${
                ((goalValue - sliderMin) / (sliderMax - sliderMin)) * 100
              }%, ${chartUi.sliderRest} ${
                ((goalValue - sliderMin) / (sliderMax - sliderMin)) * 100
              }%, ${chartUi.sliderRest} 100%)`,
            }}
          />

          <p className="mt-1 text-[10px] text-muted">
            {goalMet} von {rawData.length} Einträgen ({goalPct}%) erreichen das
            Ziel
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{
              borderColor: `${cardColor}40`,
              borderTopColor: cardColor,
            }}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted">
            Keine Daten im gewählten Zeitraum
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
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
                  stripEmoji(displayCard?.label ?? ""),
                ];
              }}
            />

            {selectedDateLabel && (
              <ReferenceLine
                x={selectedDateLabel}
                stroke={cardColor}
                strokeWidth={2}
                strokeOpacity={0.8}
                strokeDasharray="4 3"
                label={{
                  value: "●",
                  position: "top",
                  fill: cardColor,
                  fontSize: 10,
                }}
              />
            )}

            {goalActive && (
              <ReferenceLine
                y={goalDisplayValue}
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
                fillOpacity={chartType === "mixed" ? 0.3 : 0.75}
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            )}

            {(chartType === "line" || chartType === "mixed") && (
              <Line
                type="monotone"
                dataKey="value"
                stroke={cardColor}
                strokeWidth={2}
                dot={
                  goalActive
                    ? (props: any) => {
                        const { cx, cy, payload } = props;
                        const met =
                          weightGoal === "gain"
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

            {trendActive && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke={chartUi.trend}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
