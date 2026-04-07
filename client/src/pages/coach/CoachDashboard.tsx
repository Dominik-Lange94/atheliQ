import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCoachAthletes, useAthleteStats } from "../../hooks/useStats";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { useChatUnread } from "../../hooks/useChatUnread";

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: "rose",
  calories: "orange",
  weight: "blue",
  steps: "green",
  sleep: "purple",
  custom: "yellow",
};

const COLOR_OPTIONS = [
  { key: "rose", hex: "#f43f5e", dot: "bg-rose-400" },
  { key: "orange", hex: "#f97316", dot: "bg-orange-400" },
  { key: "amber", hex: "#f59e0b", dot: "bg-amber-400" },
  { key: "green", hex: "#22c55e", dot: "bg-green-400" },
  { key: "teal", hex: "#14b8a6", dot: "bg-teal-400" },
  { key: "blue", hex: "#3b82f6", dot: "bg-blue-400" },
  { key: "indigo", hex: "#6366f1", dot: "bg-indigo-400" },
  { key: "purple", hex: "#a855f7", dot: "bg-purple-400" },
  { key: "pink", hex: "#ec4899", dot: "bg-pink-400" },
  { key: "yellow", hex: "#FFD300", dot: "bg-[#FFD300]" },
];

function getHex(key: string): string {
  return COLOR_OPTIONS.find((c) => c.key === key)?.hex ?? "#FFD300";
}

function getCleanLabel(label: string): string {
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

function useCardPrefs(cardId: string, defaultColor: string) {
  const storageKey = `coach_card_prefs_${cardId}`;

  const load = () => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };

  const saved = load();

  const [colorKey, setColorKeyState] = useState<string>(
    saved?.colorKey ?? defaultColor
  );
  const [chartType, setChartTypeState] = useState<string>(
    saved?.chartType ?? "line"
  );
  const [weightGoal, setWeightGoalState] = useState<"lose" | "gain">(
    saved?.weightGoal ?? "lose"
  );

  const save = (next: any) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const setColorKey = (v: string) => {
    setColorKeyState(v);
    save({ colorKey: v, chartType, weightGoal });
  };

  const setChartType = (v: string) => {
    setChartTypeState(v);
    save({ colorKey, chartType: v, weightGoal });
  };

  const setWeightGoal = (v: "lose" | "gain") => {
    setWeightGoalState(v);
    save({ colorKey, chartType, weightGoal: v });
  };

  return {
    colorKey,
    setColorKey,
    chartType,
    setChartType,
    weightGoal,
    setWeightGoal,
  };
}

function AthleteStatCard({ card, entries }: { card: any; entries: any[] }) {
  const athleteColorKey = card.color ?? DEFAULT_COLORS[card.type] ?? "yellow";
  const {
    colorKey,
    setColorKey,
    chartType,
    setChartType,
    weightGoal,
    setWeightGoal,
  } = useCardPrefs(card._id, athleteColorKey);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isPaceCard = card.unit === "min/km";
  const isSpeedCard = card.unit === "km/h";
  const isWeightCard = card.unit === "kg";
  const cardColor = getHex(colorKey);
  const displayUnit = getDisplayUnit(card.unit);

  const chartData = entries.map((e: any) => {
    let displayValue = e.value;
    if (isPaceCard && e.secondaryValue && e.value)
      displayValue = +(e.secondaryValue / e.value).toFixed(2);
    else if (isSpeedCard && e.secondaryValue && e.value)
      displayValue = +(e.value / (e.secondaryValue / 60)).toFixed(1);

    return {
      date: new Date(e.recordedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
      }),
      value: displayValue,
      _real: displayValue,
    };
  });

  const maxVal = chartData.length
    ? Math.max(...chartData.map((d) => d.value))
    : 0;
  const minVal = chartData.length
    ? Math.min(...chartData.map((d) => d.value))
    : 0;

  const shouldInvert = (isWeightCard && weightGoal === "lose") || isPaceCard;

  const displayData = shouldInvert
    ? chartData.map((d) => ({
        ...d,
        value: +(maxVal + minVal - d.value).toFixed(2),
      }))
    : chartData;

  const latest = entries[entries.length - 1];
  const latestDisplay = chartData[chartData.length - 1]?._real;
  const firstDisplay = chartData[0]?._real;
  const trend =
    latestDisplay != null && firstDisplay != null
      ? +(latestDisplay - firstDisplay).toFixed(2)
      : null;

  const trendPositiveIsGood =
    !isPaceCard && !(isWeightCard && weightGoal === "lose");

  const trendColor =
    trend === null || trend === 0
      ? "text-slate-400"
      : trendPositiveIsGood
      ? trend > 0
        ? "text-green-400"
        : "text-red-400"
      : trend < 0
      ? "text-green-400"
      : "text-red-400";

  const latestDisplayValue = (() => {
    if (!latest) return "—";
    if (isPaceCard && latest.secondaryValue && latest.value)
      return (latest.secondaryValue / latest.value).toFixed(2);
    if (isSpeedCard && latest.secondaryValue && latest.value)
      return (latest.value / (latest.secondaryValue / 60)).toFixed(1);
    return latest.value;
  })();

  return (
    <div
      className="bg-white/3 border rounded-2xl p-5 relative"
      style={{ borderColor: `${cardColor}25` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-medium text-sm">
            {getCleanLabel(card.label)}
          </p>
          <p className="text-slate-400 text-xs">{displayUnit}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold" style={{ color: cardColor }}>
            {latestDisplayValue}
          </p>
          {trend !== null && trend !== 0 && (
            <p className={`text-xs ${trendColor}`}>
              {trend > 0 ? "+" : ""}
              {trend} gesamt
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
          {(["line", "bar", "mixed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
              style={
                chartType === t
                  ? { backgroundColor: cardColor, color: "#0f0f13" }
                  : { color: "#64748b" }
              }
            >
              {t === "line" ? "〰" : t === "bar" ? "▮" : "▮〰"}
            </button>
          ))}
        </div>

        {isWeightCard && (
          <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
            {(["lose", "gain"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setWeightGoal(g)}
                className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                style={
                  weightGoal === g
                    ? { backgroundColor: cardColor, color: "#0f0f13" }
                    : { color: "#64748b" }
                }
              >
                {g === "lose" ? "📉" : "📈"}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowColorPicker((v) => !v)}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-all"
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: cardColor }}
          />
          <svg
            className="w-3 h-3 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {showColorPicker && (
        <div className="mb-3 p-2 bg-[#12121a] border border-white/10 rounded-xl grid grid-cols-10 gap-1">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setColorKey(c.key);
                setShowColorPicker(false);
              }}
              className={`flex items-center justify-center h-7 rounded-lg border transition-all ${
                colorKey === c.key
                  ? "border-white/40 bg-white/10"
                  : "border-transparent hover:border-white/20"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full ${c.dot}`} />
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart
          data={displayData}
          margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#1e1e2e",
              border: `1px solid ${cardColor}30`,
              borderRadius: "10px",
              color: "#e2e8f0",
              fontSize: "12px",
            }}
            formatter={(_v: any, _n: any, props: any) => [
              <span style={{ color: cardColor }}>
                {props.payload._real} {displayUnit}
              </span>,
              getCleanLabel(card.label),
            ]}
          />
          {(chartType === "bar" || chartType === "mixed") && (
            <Bar
              dataKey="value"
              fill={cardColor}
              fillOpacity={chartType === "mixed" ? 0.3 : 0.75}
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
          )}
          {(chartType === "line" || chartType === "mixed") && (
            <Line
              type="monotone"
              dataKey="value"
              stroke={cardColor}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: cardColor }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SortableStatCard({ card, entries }: { card: any; entries: any[] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-0" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-[#FFD300]/40 ring-dashed pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="bg-black/60 rounded-lg px-2 py-1 flex items-center gap-1.5">
          <svg
            className="w-3 h-3 text-[#FFD300]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span className="text-[10px] text-[#FFD300] font-medium">Ziehen</span>
        </div>
      </div>
      <div className="pointer-events-none opacity-60">
        <AthleteStatCard card={card} entries={entries} />
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const { user, logout } = useAuth();
  const { data: relations = [], isLoading } = useCoachAthletes(user?._id);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    null
  );
  const { data: athleteStats = [] } = useAthleteStats(selectedAthleteId);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [orderedStats, setOrderedStats] = useState<any[]>([]);
  const { totalUnread } = useChatUnread();

  const safeRelations = useMemo(
    () =>
      relations.filter(
        (r: any) =>
          r &&
          r._id &&
          r.athleteId &&
          typeof r.athleteId === "object" &&
          r.athleteId._id &&
          r.athleteId.name
      ),
    [relations]
  );

  const selectedRelation =
    safeRelations.find((r: any) => r.athleteId._id === selectedAthleteId) ??
    null;

  useEffect(() => {
    const normalized = Array.isArray(athleteStats)
      ? athleteStats.filter((s: any) => s?.card?._id)
      : [];

    if (normalized.length === 0) {
      setOrderedStats((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const key = `coach_order_${selectedAthleteId}`;

    let next = normalized;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const savedIds: string[] = JSON.parse(saved);
        next = [...normalized].sort((a, b) => {
          const ai = savedIds.indexOf(a.card._id);
          const bi = savedIds.indexOf(b.card._id);
          return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
        });
      }
    } catch {}

    setOrderedStats((prev) => {
      const prevIds = prev.map((s) => s.card._id).join("|");
      const nextIds = next.map((s) => s.card._id).join("|");
      return prevIds === nextIds ? prev : next;
    });
  }, [athleteStats, selectedAthleteId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#FFD300]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-white font-medium">FitTrack</span>
          <span className="text-xs text-[#FFD300] bg-[#FFD300]/10 border border-[#FFD300]/20 px-2 py-0.5 rounded-full">
            Coach
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden sm:block">
            {user?.name}
          </span>

          <Link
            to="/chat"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
            title="Nachrichten"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M8 10h8M8 14h5m-6 6l-3-3V7a3 3 0 013-3h12a3 3 0 013 3v7a3 3 0 01-3 3h-8l-4 3z"
              />
            </svg>

            {totalUnread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-[#FFD300] text-[#0f0f13] text-[10px] font-extrabold flex items-center justify-center shadow-lg">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            ) : null}
          </Link>

          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Athletes</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor your athletes&apos; progress
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : safeRelations.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm">No athletes linked yet</p>
            <p className="text-slate-500 text-xs mt-1">
              Athletes need to grant you access from their dashboard
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {safeRelations.map((rel: any) => (
              <button
                key={rel._id}
                onClick={() =>
                  setSelectedAthleteId((prev) =>
                    prev === rel.athleteId._id ? null : rel.athleteId._id
                  )
                }
                className={`text-left p-4 rounded-2xl border transition-all ${
                  selectedAthleteId === rel.athleteId._id
                    ? "border-[#FFD300]/50 bg-[#FFD300]/5"
                    : "border-white/10 bg-white/3 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FFD300]/20 flex items-center justify-center text-[#FFD300] font-semibold text-sm">
                    {rel.athleteId.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {rel.athleteId.name}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {rel.allowedMetrics?.length ?? 0} metrics shared
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedAthleteId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-medium">
                {selectedRelation?.athleteId?.name}&apos;s progress
              </h2>

              {orderedStats.length > 1 && (
                <button
                  onClick={() => setArrangeMode((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    arrangeMode
                      ? "bg-[#FFD300]/10 border-[#FFD300]/40 text-[#FFD300]"
                      : "bg-transparent border-white/20 text-slate-400 hover:text-white hover:border-white/30"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  {arrangeMode ? "Fertig" : "Arrange cards"}
                </button>
              )}
            </div>

            {orderedStats.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">No shared metrics yet</p>
              </div>
            ) : arrangeMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;

                  setOrderedStats((prev) => {
                    const oldIndex = prev.findIndex(
                      (s) => s.card._id === active.id
                    );
                    const newIndex = prev.findIndex(
                      (s) => s.card._id === over.id
                    );
                    const next = arrayMove(prev, oldIndex, newIndex);

                    localStorage.setItem(
                      `coach_order_${selectedAthleteId}`,
                      JSON.stringify(next.map((s) => s.card._id))
                    );

                    return next;
                  });
                }}
              >
                <SortableContext
                  items={orderedStats.map((s) => s.card._id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    {orderedStats.map(({ card, entries }: any) => (
                      <SortableStatCard
                        key={card._id}
                        card={card}
                        entries={entries}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {orderedStats.map(({ card, entries }: any) => (
                  <AthleteStatCard
                    key={card._id}
                    card={card}
                    entries={entries}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
