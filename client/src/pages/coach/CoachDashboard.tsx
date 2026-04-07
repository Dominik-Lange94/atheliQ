import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCoachAthletes, useAthleteStats, useAthletesActivity } from "../../hooks/useStats";
import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { useChatUnread } from "../../hooks/useChatUnread";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
const TODAY = toDateStr(new Date());

function formatDateDisplay(dateStr: string): string {
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === TODAY)     return "Heute";
  if (dateStr === yesterday) return "Gestern";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

function buildDayWindow(windowOffset: number) {
  const days = [];
  for (let i = windowOffset - 7; i <= windowOffset; i++) {
    const d = new Date(TODAY + "T12:00:00");
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: toDateStr(d),
      day: d.getDate(),
      weekday: d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2),
    });
  }
  return days;
}

// ─── Time range helpers ───────────────────────────────────────────────────────

const TIME_RANGES = [
  { key: "1D", label: "1T",  days: 1 },
  { key: "1W", label: "1W",  days: 7 },
  { key: "1M", label: "1M",  days: 30 },
  { key: "3M", label: "3M",  days: 90 },
  { key: "1Y", label: "1J",  days: 365 },
  { key: "free", label: "Frei", days: 0 },
];

interface RangeState {
  key: string;
  offset: number;        // how many range-widths shifted into the past (0 = includes today)
  customFrom?: string;
  customTo?:   string;
}

function computeFromTo(range: RangeState): { from: string; to: string } {
  if (range.key === "free") {
    return { from: range.customFrom ?? "", to: range.customTo ?? "" };
  }
  const r    = TIME_RANGES.find((t) => t.key === range.key)!;
  const days = r.days;
  const toD  = new Date(TODAY + "T12:00:00");
  toD.setDate(toD.getDate() - range.offset * days);
  const fromD = new Date(toD);
  fromD.setDate(fromD.getDate() - days + 1);
  return { from: toDateStr(fromD), to: toDateStr(toD) };
}

function rangeLabel(range: RangeState): string {
  if (range.key === "free") return "Frei";
  const { from, to } = computeFromTo(range);
  const fmtShort = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  return `${fmtShort(from)} – ${fmtShort(to)}`;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: "rose", calories: "orange", weight: "blue",
  steps: "green", sleep: "purple", custom: "yellow",
};
const COLOR_OPTIONS = [
  { key: "rose",   hex: "#f43f5e", dot: "bg-rose-400" },
  { key: "orange", hex: "#f97316", dot: "bg-orange-400" },
  { key: "amber",  hex: "#f59e0b", dot: "bg-amber-400" },
  { key: "green",  hex: "#22c55e", dot: "bg-green-400" },
  { key: "teal",   hex: "#14b8a6", dot: "bg-teal-400" },
  { key: "blue",   hex: "#3b82f6", dot: "bg-blue-400" },
  { key: "indigo", hex: "#6366f1", dot: "bg-indigo-400" },
  { key: "purple", hex: "#a855f7", dot: "bg-purple-400" },
  { key: "pink",   hex: "#ec4899", dot: "bg-pink-400" },
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
function fmtVal(value: number): string {
  return parseFloat(parseFloat(value.toFixed(2)).toString()).toString();
}

// ─── Card prefs ───────────────────────────────────────────────────────────────

function useCardPrefs(cardId: string, defaultColor: string) {
  const key  = `coach_card_prefs_${cardId}`;
  const load = () => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; } };
  const saved = load();
  const [colorKey,   setColorKeyState]   = useState<string>(saved?.colorKey ?? defaultColor);
  const [chartType,  setChartTypeState]  = useState<string>(saved?.chartType ?? "line");
  const [weightGoal, setWeightGoalState] = useState<"lose"|"gain">(saved?.weightGoal ?? "lose");
  const save = (next: any) => { try { localStorage.setItem(key, JSON.stringify(next)); } catch {} };
  const setColorKey   = (v: string)          => { setColorKeyState(v);   save({ colorKey: v, chartType, weightGoal }); };
  const setChartType  = (v: string)          => { setChartTypeState(v);  save({ colorKey, chartType: v, weightGoal }); };
  const setWeightGoal = (v: "lose"|"gain")  => { setWeightGoalState(v); save({ colorKey, chartType, weightGoal: v }); };
  return { colorKey, setColorKey, chartType, setChartType, weightGoal, setWeightGoal };
}

// ─── AthleteStatCard ──────────────────────────────────────────────────────────

function AthleteStatCard({
  card, entries, selectedDate, range,
}: {
  card: any; entries: any[]; selectedDate: string; range: RangeState;
}) {
  const athleteColorKey = card.color ?? DEFAULT_COLORS[card.type] ?? "yellow";
  const { colorKey, setColorKey, chartType, setChartType, weightGoal, setWeightGoal } =
    useCardPrefs(card._id, athleteColorKey);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isPaceCard   = card.unit === "min/km";
  const isSpeedCard  = card.unit === "km/h";
  const isWeightCard = card.unit === "kg";
  const cardColor    = getHex(colorKey);
  const displayUnit  = getDisplayUnit(card.unit);

  const chartData = entries.map((e: any) => {
    let v = e.value;
    if (isPaceCard  && e.secondaryValue && e.value) v = +(e.secondaryValue / e.value).toFixed(2);
    else if (isSpeedCard && e.secondaryValue && e.value) v = +(e.value / (e.secondaryValue / 60)).toFixed(1);
    return {
      date:    new Date(e.recordedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
      dateISO: toDateStr(new Date(e.recordedAt)),
      value:   v,
      _real:   v,
    };
  });

  const maxVal = chartData.length ? Math.max(...chartData.map((d) => d.value)) : 0;
  const minVal = chartData.length ? Math.min(...chartData.map((d) => d.value)) : 0;
  const shouldInvert = (isWeightCard && weightGoal === "lose") || isPaceCard;
  const displayData  = shouldInvert
    ? chartData.map((d) => ({ ...d, value: +(maxVal + minVal - d.value).toFixed(2) }))
    : chartData;

  // Day value for selected date
  const dayEntry = entries.find((e: any) => toDateStr(new Date(e.recordedAt)) === selectedDate);
  const dayValue = dayEntry
    ? isPaceCard && dayEntry.secondaryValue && dayEntry.value
      ? (dayEntry.secondaryValue / dayEntry.value).toFixed(2)
      : isSpeedCard && dayEntry.secondaryValue && dayEntry.value
      ? (dayEntry.value / (dayEntry.secondaryValue / 60)).toFixed(1)
      : fmtVal(dayEntry.value)
    : null;

  // Trend
  const latestD = chartData[chartData.length - 1]?._real;
  const firstD  = chartData[0]?._real;
  const trend   = latestD != null && firstD != null ? +(latestD - firstD).toFixed(2) : null;
  const trendPos = !isPaceCard && !(isWeightCard && weightGoal === "lose");
  const trendColor = trend === null || trend === 0 ? "text-slate-400"
    : trendPos ? (trend > 0 ? "text-green-400" : "text-red-400")
               : (trend < 0 ? "text-green-400" : "text-red-400");

  // ReferenceLine for selected day
  const selLabel = displayData.find((d) => d.dateISO === selectedDate)?.date;

  return (
    <div className="bg-white/3 border rounded-2xl p-5 relative" style={{ borderColor: `${cardColor}25` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-medium text-sm">{getCleanLabel(card.label)}</p>
          <p className="text-slate-400 text-xs">{displayUnit}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold" style={{ color: cardColor }}>
            {dayValue ?? (chartData[chartData.length - 1]?._real != null ? fmtVal(chartData[chartData.length - 1]._real) : "—")}
          </p>
          {dayValue && selectedDate !== TODAY && (
            <p className="text-[10px] text-slate-500">{formatDateDisplay(selectedDate)}</p>
          )}
          {trend !== null && trend !== 0 && (
            <p className={`text-xs ${trendColor}`}>{trend > 0 ? "+" : ""}{trend} gesamt</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
          {(["line","bar","mixed"] as const).map((t) => (
            <button key={t} onClick={() => setChartType(t)}
              className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
              style={chartType === t ? { backgroundColor: cardColor, color: "#0f0f13" } : { color: "#64748b" }}>
              {t === "line" ? "〰" : t === "bar" ? "▮" : "▮〰"}
            </button>
          ))}
        </div>
        {isWeightCard && (
          <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
            {(["lose","gain"] as const).map((g) => (
              <button key={g} onClick={() => setWeightGoal(g)}
                className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                style={weightGoal === g ? { backgroundColor: cardColor, color: "#0f0f13" } : { color: "#64748b" }}>
                {g === "lose" ? "📉" : "📈"}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowColorPicker((v) => !v)}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-all">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cardColor }} />
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {showColorPicker && (
        <div className="mb-3 p-2 bg-[#12121a] border border-white/10 rounded-xl grid grid-cols-10 gap-1">
          {COLOR_OPTIONS.map((c) => (
            <button key={c.key} onClick={() => { setColorKey(c.key); setShowColorPicker(false); }}
              className={`flex items-center justify-center h-7 rounded-lg border transition-all ${
                colorKey === c.key ? "border-white/40 bg-white/10" : "border-transparent hover:border-white/20"
              }`}>
              <span className={`w-3.5 h-3.5 rounded-full ${c.dot}`} />
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto","auto"]} />
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: `1px solid ${cardColor}30`, borderRadius: "10px", color: "#e2e8f0", fontSize: "12px" }}
            formatter={(_v: any, _n: any, props: any) => [
              <span style={{ color: cardColor }}>{props.payload._real} {displayUnit}</span>,
              getCleanLabel(card.label),
            ]}
          />
          {selLabel && (
            <ReferenceLine x={selLabel} stroke={cardColor} strokeWidth={1.5} strokeOpacity={0.7} strokeDasharray="4 3" />
          )}
          {(chartType === "bar" || chartType === "mixed") && (
            <Bar dataKey="value" fill={cardColor} fillOpacity={chartType === "mixed" ? 0.3 : 0.75} radius={[2,2,0,0]} maxBarSize={20} />
          )}
          {(chartType === "line" || chartType === "mixed") && (
            <Line type="monotone" dataKey="value" stroke={cardColor} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: cardColor }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── SortableStatCard ─────────────────────────────────────────────────────────

function SortableStatCard({ card, entries, selectedDate, range }: { card: any; entries: any[]; selectedDate: string; range: RangeState }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card._id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative cursor-grab active:cursor-grabbing ${isDragging ? "opacity-0" : ""}`}
      {...attributes} {...listeners}>
      <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-[#FFD300]/40 ring-dashed pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="bg-black/60 rounded-lg px-2 py-1 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-[#FFD300]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span className="text-[10px] text-[#FFD300] font-medium">Ziehen</span>
        </div>
      </div>
      <div className="pointer-events-none opacity-60">
        <AthleteStatCard card={card} entries={entries} selectedDate={selectedDate} range={range} />
      </div>
    </div>
  );
}

// ─── CoachDashboard ───────────────────────────────────────────────────────────

export default function CoachDashboard() {
  const { user, logout } = useAuth();
  const { data: relations = [], isLoading } = useCoachAthletes(user?._id);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [arrangeMode, setArrangeMode]             = useState(false);
  const [orderedStats, setOrderedStats]           = useState<any[]>([]);
  const { totalUnread } = useChatUnread();

  // ── Calendar state ──
  const [selectedDate,  setSelectedDate]  = useState<string>(TODAY);
  const [windowOffset,  setWindowOffset]  = useState<number>(0);
  const isToday   = selectedDate === TODAY;
  const dayWindow = buildDayWindow(windowOffset);

  // ── Time range state ──
  const [range, setRange] = useState<RangeState>({ key: "1M", offset: 0 });
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return toDateStr(d); });
  const [customTo,   setCustomTo]   = useState(TODAY);

  const { from, to } = useMemo(() => {
    if (range.key === "free") return { from: customFrom, to: customTo };
    return computeFromTo(range);
  }, [range, customFrom, customTo]);

  // Fetch athlete stats with date range
  const { data: athleteData } = useAthleteStats(selectedAthleteId, { from, to });
  const athleteStats = athleteData?.stats ?? [];

  // Activity for all athletes in current range
  const { data: activityData = [] } = useAthletesActivity({ from, to });
  const activityMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    activityData.forEach((a) => { m[a.athleteId] = a.isActive; });
    return m;
  }, [activityData]);

  const safeRelations = useMemo(
    () => relations.filter((r: any) =>
      r && r._id && r.athleteId && typeof r.athleteId === "object" && r.athleteId._id && r.athleteId.name
    ),
    [relations]
  );

  const selectedRelation = safeRelations.find((r: any) => r.athleteId._id === selectedAthleteId) ?? null;

  useEffect(() => {
    const normalized = Array.isArray(athleteStats) ? athleteStats.filter((s: any) => s?.card?._id) : [];
    if (normalized.length === 0) { setOrderedStats((prev) => (prev.length === 0 ? prev : [])); return; }
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
    useSensor(TouchSensor,  { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  // Calendar nav
  const goToPrevDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const nd = toDateStr(d);
    setSelectedDate(nd);
    if (!buildDayWindow(windowOffset).find((day) => day.dateStr === nd)) setWindowOffset((o) => o - 1);
  };
  const goToNextDay = () => {
    if (isToday) return;
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const nd = toDateStr(d);
    if (nd <= TODAY) {
      setSelectedDate(nd);
      if (!buildDayWindow(windowOffset).find((day) => day.dateStr === nd)) setWindowOffset((o) => Math.min(o + 1, 0));
    }
  };
  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const diff = Math.round((new Date(dateStr + "T12:00:00").getTime() - new Date(TODAY + "T12:00:00").getTime()) / 86400000);
    setWindowOffset(Math.min(diff, 0));
  };

  // Range nav
  const canGoForward = range.key !== "free" && range.offset > 0;
  const shiftRange = (dir: -1 | 1) => {
    setRange((r) => ({ ...r, offset: Math.max(0, r.offset - dir) }));
  };

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#FFD300]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-medium">FitTrack</span>
          <span className="text-xs text-[#FFD300] bg-[#FFD300]/10 border border-[#FFD300]/20 px-2 py-0.5 rounded-full">Coach</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden sm:block">{user?.name}</span>
          <Link to="/chat"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
            title="Nachrichten">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                d="M8 10h8M8 14h5m-6 6l-3-3V7a3 3 0 013-3h12a3 3 0 013 3v7a3 3 0 01-3 3h-8l-4 3z" />
            </svg>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-[#FFD300] text-[#0f0f13] text-[10px] font-extrabold flex items-center justify-center shadow-lg">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>
          <button onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title + date control */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white">Athletes</h1>
            <p className="text-slate-400 text-sm mt-1">Monitor your athletes&apos; progress</p>
          </div>
          <div className="flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-3 py-2 flex-shrink-0">
            <button onClick={goToPrevDay}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm">←</button>
            <div className="text-center min-w-[120px]">
              <p className="text-white text-sm font-medium leading-tight">{formatDateDisplay(selectedDate)}</p>
              {!isToday && (
                <p className="text-slate-500 text-xs">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </p>
              )}
            </div>
            <button onClick={goToNextDay} disabled={isToday}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm">→</button>
            <div className="w-px h-5 bg-white/10" />
            <button onClick={() => { setSelectedDate(TODAY); setWindowOffset(0); }} disabled={isToday}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                isToday ? "border-white/5 text-slate-600 cursor-not-allowed" : "border-[#FFD300]/30 text-[#FFD300] hover:border-[#FFD300]/60 hover:bg-[#FFD300]/5"
              }`}>
              Heute
            </button>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => shiftRange(-1)}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={range.key === "free"}>←</button>

          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
            {TIME_RANGES.map((r) => (
              <button key={r.key}
                onClick={() => { setRange({ key: r.key, offset: 0 }); setShowCustom(r.key === "free"); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  range.key === r.key ? "bg-[#FFD300] text-[#0f0f13]" : "text-slate-400 hover:text-white"
                }`}>
                {r.label}
              </button>
            ))}
          </div>

          <button onClick={() => shiftRange(1)} disabled={!canGoForward}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">→</button>

          <span className="text-slate-500 text-xs ml-1">{range.key !== "free" ? rangeLabel(range) : ""}</span>
        </div>

        {/* Custom date range */}
        {range.key === "free" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFD300]/50" />
            <span className="text-slate-500 text-xs">bis</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFD300]/50" />
          </div>
        )}

        {/* Athletes grid — with activity indicator */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : safeRelations.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm">No athletes linked yet</p>
            <p className="text-slate-500 text-xs mt-1">Athletes need to grant you access from their dashboard</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {safeRelations.map((rel: any) => {
              const aid      = rel.athleteId._id;
              const activity = activityMap[aid];      // true=active, false=inactive, undefined=unknown
              const isSelected = selectedAthleteId === aid;
              return (
                <button key={rel._id}
                  onClick={() => setSelectedAthleteId((prev) => prev === aid ? null : aid)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    isSelected ? "border-[#FFD300]/50 bg-[#FFD300]/5" : "border-white/10 bg-white/3 hover:bg-white/5"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#FFD300]/20 flex items-center justify-center text-[#FFD300] font-semibold text-sm">
                        {rel.athleteId.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Activity dot */}
                      {activity !== undefined && (
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f0f13] ${
                          activity ? "bg-green-400" : "bg-red-400"
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{rel.athleteId.name}</p>
                      <p className={`text-xs ${
                        activity === true  ? "text-green-400" :
                        activity === false ? "text-red-400"   : "text-slate-400"
                      }`}>
                        {activity === true  ? "Aktiv im Zeitraum" :
                         activity === false ? "Inaktiv im Zeitraum" :
                         `${rel.allowedMetrics?.length ?? 0} metrics shared`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedAthleteId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-medium">
                {selectedRelation?.athleteId?.name}&apos;s progress
                <span className="text-slate-500 text-sm font-normal ml-2">· {rangeLabel(range)}</span>
              </h2>
              {orderedStats.length > 1 && (
                <button onClick={() => setArrangeMode((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    arrangeMode ? "bg-[#FFD300]/10 border-[#FFD300]/40 text-[#FFD300]" : "bg-transparent border-white/20 text-slate-400 hover:text-white hover:border-white/30"
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
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
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  setOrderedStats((prev) => {
                    const oi = prev.findIndex((s) => s.card._id === active.id);
                    const ni = prev.findIndex((s) => s.card._id === over.id);
                    const next = arrayMove(prev, oi, ni);
                    localStorage.setItem(`coach_order_${selectedAthleteId}`, JSON.stringify(next.map((s) => s.card._id)));
                    return next;
                  });
                }}>
                <SortableContext items={orderedStats.map((s) => s.card._id)} strategy={rectSortingStrategy}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {orderedStats.map(({ card, entries }: any) => (
                      <SortableStatCard key={card._id} card={card} entries={entries} selectedDate={selectedDate} range={range} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {orderedStats.map(({ card, entries }: any) => (
                  <AthleteStatCard key={card._id} card={card} entries={entries} selectedDate={selectedDate} range={range} />
                ))}
              </div>
            )}

            {/* Day strip */}
            {orderedStats.length > 0 && (
              <div className="border border-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setWindowOffset((o) => o - 1)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all flex-shrink-0 text-sm">←</button>
                  <div className="flex-1 flex gap-1">
                    {dayWindow.map(({ dateStr, day, weekday }) => {
                      const isSel    = dateStr === selectedDate;
                      const isT      = dateStr === TODAY;
                      const isFuture = dateStr > TODAY;
                      return (
                        <button key={dateStr} onClick={() => !isFuture && selectDate(dateStr)} disabled={isFuture}
                          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border transition-all ${
                            isSel    ? "bg-[#FFD300]/12 border-[#FFD300]/40" :
                            isT      ? "bg-white/5 border-white/15 hover:border-white/25" :
                            isFuture ? "border-transparent opacity-20 cursor-not-allowed" :
                            "border-transparent hover:bg-white/5 hover:border-white/10"
                          }`}>
                          <span className={`text-[9px] font-medium uppercase tracking-wide ${isSel ? "text-[#FFD300]" : isT ? "text-slate-300" : "text-slate-500"}`}>
                            {weekday}
                          </span>
                          <span className={`text-xs font-semibold leading-none ${isSel ? "text-[#FFD300]" : isT ? "text-white" : "text-slate-400"}`}>
                            {day}
                          </span>
                          {isT && !isSel && <span className="w-1 h-1 rounded-full bg-[#FFD300]/50 mt-0.5" />}
                          {isSel       && <span className="w-1 h-1 rounded-full bg-[#FFD300] mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setWindowOffset((o) => Math.min(o + 1, 0))} disabled={windowOffset >= 0}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed text-sm">→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
