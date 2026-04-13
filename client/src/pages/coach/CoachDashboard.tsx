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

// ─── Datum-Helfer ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
const TODAY = toDateStr(new Date());

function datumAnzeige(dateStr: string): string {
  const gestern = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === TODAY)   return "Heute";
  if (dateStr === gestern) return "Gestern";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

// ─── Zeitraum-Helfer ──────────────────────────────────────────────────────────

const ZEITRAEUME = [
  { key: "1T", label: "1T",   days: 1 },
  { key: "1W", label: "1W",   days: 7 },
  { key: "1M", label: "1M",   days: 30 },
  { key: "3M", label: "3M",   days: 90 },
  { key: "1J", label: "1J",   days: 365 },
  { key: "frei", label: "Frei", days: 0 },
];

interface ZeitraumState {
  key: string;
  offset: number; // wie viele Zeitraum-Breiten in die Vergangenheit
  freiVon?: string;
  freiBis?: string;
}

function berechneVonBis(z: ZeitraumState): { von: string; bis: string } {
  if (z.key === "frei") return { von: z.freiVon ?? "", bis: z.freiBis ?? "" };
  const r    = ZEITRAEUME.find((t) => t.key === z.key)!;
  const bisD = new Date(TODAY + "T12:00:00");
  bisD.setDate(bisD.getDate() - z.offset * r.days);
  const vonD = new Date(bisD);
  vonD.setDate(vonD.getDate() - r.days + 1);
  return { von: toDateStr(vonD), bis: toDateStr(bisD) };
}

function zeitraumLabel(z: ZeitraumState): string {
  if (z.key === "frei") return `${z.freiVon ?? "?"} – ${z.freiBis ?? "?"}`;
  const { von, bis } = berechneVonBis(z);
  const fmt = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  return `${fmt(von)} – ${fmt(bis)}`;
}

// ─── Farben ───────────────────────────────────────────────────────────────────

const STD_FARBEN: Record<string, string> = {
  heartrate: "rose", calories: "orange", weight: "blue",
  steps: "green", sleep: "purple", custom: "yellow",
};
const FARB_OPTIONEN = [
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
  return FARB_OPTIONEN.find((c) => c.key === key)?.hex ?? "#FFD300";
}
function ohneEmoji(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, "");
}
function anzeigeEinheit(unit: string): string {
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
function fmtWert(value: number): string {
  return parseFloat(parseFloat(value.toFixed(2)).toString()).toString();
}

// ─── Karten-Einstellungen (Coach-lokal) ───────────────────────────────────────

function useKartenPrefs(cardId: string, defaultColor: string) {
  const sk = `coach_card_prefs_${cardId}`;
  const load = () => { try { const s = localStorage.getItem(sk); return s ? JSON.parse(s) : null; } catch { return null; } };
  const saved = load();
  const [farbKey,    setFarbKeyState]    = useState<string>(saved?.farbKey ?? defaultColor);
  const [chartTyp,   setChartTypState]   = useState<string>(saved?.chartTyp ?? "line");
  const [gewichtZiel, setGewichtZielState] = useState<"abnehmen"|"zunehmen">(saved?.gewichtZiel ?? "abnehmen");
  const save = (n: any) => { try { localStorage.setItem(sk, JSON.stringify(n)); } catch {} };
  const setFarbKey     = (v: string)                => { setFarbKeyState(v);     save({ farbKey: v, chartTyp, gewichtZiel }); };
  const setChartTyp    = (v: string)                => { setChartTypState(v);    save({ farbKey, chartTyp: v, gewichtZiel }); };
  const setGewichtZiel = (v: "abnehmen"|"zunehmen") => { setGewichtZielState(v); save({ farbKey, chartTyp, gewichtZiel: v }); };
  return { farbKey, setFarbKey, chartTyp, setChartTyp, gewichtZiel, setGewichtZiel };
}

// ─── AthletKarte ──────────────────────────────────────────────────────────────

function AthletKarte({
  card, entries, ausgewaehltesdatum,
}: {
  card: any; entries: any[]; ausgewaehltesdatum: string;
}) {
  const stdFarb = card.color ?? STD_FARBEN[card.type] ?? "yellow";
  const { farbKey, setFarbKey, chartTyp, setChartTyp, gewichtZiel, setGewichtZiel } =
    useKartenPrefs(card._id, stdFarb);
  const [zeigeFarbwahl, setZeigeFarbwahl] = useState(false);

  const istPace    = card.unit === "min/km";
  const istSpeed   = card.unit === "km/h";
  const istGewicht = card.unit === "kg";
  const farbe      = getHex(farbKey);
  const einheit    = anzeigeEinheit(card.unit);

  const chartDaten = entries.map((e: any) => {
    let v = e.value;
    if (istPace  && e.secondaryValue && e.value) v = +(e.secondaryValue / e.value).toFixed(2);
    else if (istSpeed && e.secondaryValue && e.value) v = +(e.value / (e.secondaryValue / 60)).toFixed(1);
    return {
      datum:    new Date(e.recordedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
      datumISO: toDateStr(new Date(e.recordedAt)),
      wert:     v,
      _echt:    v,
    };
  });

  const maxW = chartDaten.length ? Math.max(...chartDaten.map((d) => d.wert)) : 0;
  const minW = chartDaten.length ? Math.min(...chartDaten.map((d) => d.wert)) : 0;
  const invertieren = istPace;
  const anzeigeDaten = invertieren
    ? chartDaten.map((d) => ({ ...d, wert: +(maxW + minW - d.wert).toFixed(2) }))
    : chartDaten;

  // Tageswert
  const tagesEintrag = entries.find((e: any) => toDateStr(new Date(e.recordedAt)) === ausgewaehltesdatum);
  const tagesWert = tagesEintrag
    ? istPace && tagesEintrag.secondaryValue && tagesEintrag.value
      ? (tagesEintrag.secondaryValue / tagesEintrag.value).toFixed(2)
      : istSpeed && tagesEintrag.secondaryValue && tagesEintrag.value
      ? (tagesEintrag.value / (tagesEintrag.secondaryValue / 60)).toFixed(1)
      : fmtWert(tagesEintrag.value)
    : null;

  // Trend
  const letzterW = chartDaten[chartDaten.length - 1]?._echt;
  const ersterW  = chartDaten[0]?._echt;
  const trend    = letzterW != null && ersterW != null ? +(letzterW - ersterW).toFixed(2) : null;
  const trendPos = !istPace && !(istGewicht && gewichtZiel === "abnehmen");
  const trendFarbe = trend === null || trend === 0 ? "text-slate-400"
    : trendPos ? (trend > 0 ? "text-green-400" : "text-red-400")
    : (trend < 0 ? "text-green-400" : "text-red-400");

  const refLabel = anzeigeDaten.find((d) => d.datumISO === ausgewaehltesdatum)?.datum;

  return (
    <div className="bg-white/3 border rounded-2xl p-5 relative" style={{ borderColor: `${farbe}25` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-medium text-sm">{ohneEmoji(card.label)}</p>
          <p className="text-slate-400 text-xs">{einheit}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold" style={{ color: farbe }}>
            {tagesWert ?? (chartDaten[chartDaten.length - 1]?._echt != null ? fmtWert(chartDaten[chartDaten.length - 1]._echt) : "—")}
          </p>
          {tagesWert && ausgewaehltesdatum !== TODAY && (
            <p className="text-[10px] text-slate-500">{datumAnzeige(ausgewaehltesdatum)}</p>
          )}
          {trend !== null && trend !== 0 && (
            <p className={`text-xs ${trendFarbe}`}>{trend > 0 ? "+" : ""}{trend} gesamt</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
          {(["line","bar","mixed"] as const).map((t) => (
            <button key={t} onClick={() => setChartTyp(t)}
              className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
              style={chartTyp === t ? { backgroundColor: farbe, color: "#0f0f13" } : { color: "#64748b" }}>
              {t === "line" ? "〰" : t === "bar" ? "▮" : "▮〰"}
            </button>
          ))}
        </div>
        {istGewicht && (
          <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
            {(["abnehmen","zunehmen"] as const).map((g) => (
              <button key={g} onClick={() => setGewichtZiel(g)}
                className="px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                style={gewichtZiel === g ? { backgroundColor: farbe, color: "#0f0f13" } : { color: "#64748b" }}>
                {g === "abnehmen" ? "📉" : "📈"}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setZeigeFarbwahl((v) => !v)}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-all">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: farbe }} />
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {zeigeFarbwahl && (
        <div className="mb-3 p-2 bg-[#12121a] border border-white/10 rounded-xl grid grid-cols-10 gap-1">
          {FARB_OPTIONEN.map((c) => (
            <button key={c.key} onClick={() => { setFarbKey(c.key); setZeigeFarbwahl(false); }}
              className={`flex items-center justify-center h-7 rounded-lg border transition-all ${
                farbKey === c.key ? "border-white/40 bg-white/10" : "border-transparent hover:border-white/20"
              }`}>
              <span className={`w-3.5 h-3.5 rounded-full ${c.dot}`} />
            </button>
          ))}
        </div>
      )}

      {chartDaten.length === 0 ? (
        <div className="h-[120px] flex items-center justify-center">
          <p className="text-slate-600 text-xs">Keine Daten im Zeitraum</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart data={anzeigeDaten} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="datum" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto","auto"]} />
            <Tooltip
              contentStyle={{ background: "#1e1e2e", border: `1px solid ${farbe}30`, borderRadius: "10px", color: "#e2e8f0", fontSize: "12px" }}
              formatter={(_v: any, _n: any, props: any) => [
                <span style={{ color: farbe }}>{props.payload._echt} {einheit}</span>,
                ohneEmoji(card.label),
              ]}
            />
            {refLabel && (
              <ReferenceLine x={refLabel} stroke={farbe} strokeWidth={1.5} strokeOpacity={0.7} strokeDasharray="4 3" />
            )}
            {(chartTyp === "bar" || chartTyp === "mixed") && (
              <Bar dataKey="wert" fill={farbe} fillOpacity={chartTyp === "mixed" ? 0.3 : 0.75} radius={[2,2,0,0]} maxBarSize={20} />
            )}
            {(chartTyp === "line" || chartTyp === "mixed") && (
              <Line type="monotone" dataKey="wert" stroke={farbe} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: farbe }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── SortierbarKarte ──────────────────────────────────────────────────────────

function SortierbarKarte({ card, entries, ausgewaehltesdatum }: { card: any; entries: any[]; ausgewaehltesdatum: string }) {
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
        <AthletKarte card={card} entries={entries} ausgewaehltesdatum={ausgewaehltesdatum} />
      </div>
    </div>
  );
}

// ─── CoachDashboard ───────────────────────────────────────────────────────────

export default function CoachDashboard() {
  const { user, logout } = useAuth();
  const { data: relations = [], isLoading } = useCoachAthletes(user?._id);
  const [ausgewaehltAthleteId, setAusgewaehltAthleteId] = useState<string | null>(null);
  const [anordneModus, setAnordneModus] = useState(false);
  // Reihenfolge der Karten (nur IDs) — getrennt von den entries!
  const [kartenReihenfolge, setKartenReihenfolge] = useState<string[]>([]);
  const { totalUnread } = useChatUnread();

  // Datum
  const [ausgewaehltesDate, setAusgewaehltesDate] = useState<string>(TODAY);
  const [fensterOffset, setFensterOffset]         = useState<number>(0);
  const istHeute  = ausgewaehltesDate === TODAY;
  const tagesFenster = useMemo(() => {
    const tage = [];
    for (let i = fensterOffset - 7; i <= fensterOffset; i++) {
      const d = new Date(TODAY + "T12:00:00");
      d.setDate(d.getDate() + i);
      tage.push({
        datumStr: toDateStr(d),
        tag: d.getDate(),
        wochentag: d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2),
      });
    }
    return tage;
  }, [fensterOffset]);

  // Zeitraum
  const [zeitraum, setZeitraum]   = useState<ZeitraumState>({ key: "1M", offset: 0 });
  const [freiVon, setFreiVon]     = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return toDateStr(d); });
  const [freiBis, setFreiBis]     = useState(TODAY);

  const { von, bis } = useMemo(() => {
    if (zeitraum.key === "frei") return { von: freiVon, bis: freiBis };
    const { von: v, bis: b } = berechneVonBis(zeitraum);
    return { von: v, bis: b };
  }, [zeitraum, freiVon, freiBis]);

  // Athleten-Daten mit Zeitraum — neu geladen wenn von/bis sich ändern
  const { data: athletData } = useAthleteStats(ausgewaehltAthleteId, { from: von, to: bis });
  const athleteStats = useMemo(() => athletData?.stats ?? [], [athletData]);

  // Aktivität aller Athleten
  const { data: aktivitaetDaten = [] } = useAthletesActivity({ from: von, to: bis });
  const aktivitaetMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    aktivitaetDaten.forEach((a) => { m[a.athleteId] = a.isActive; });
    return m;
  }, [aktivitaetDaten]);

  const safeRelations = useMemo(
    () => relations.filter((r: any) =>
      r && r._id && r.athleteId && typeof r.athleteId === "object" && r.athleteId._id && r.athleteId.name
    ),
    [relations]
  );

  const ausgewaehltRelation = safeRelations.find((r: any) => r.athleteId._id === ausgewaehltAthleteId) ?? null;

  // Reihenfolge nur beim Athleten-Wechsel initialisieren, NICHT bei entries-Änderung
  useEffect(() => {
    if (!ausgewaehltAthleteId) { setKartenReihenfolge([]); return; }
    const normalized = Array.isArray(athleteStats) ? athleteStats.filter((s: any) => s?.card?._id) : [];
    if (normalized.length === 0) return;
    const sk = `coach_order_${ausgewaehltAthleteId}`;
    try {
      const saved = localStorage.getItem(sk);
      if (saved) {
        const savedIds: string[] = JSON.parse(saved);
        setKartenReihenfolge(savedIds);
      } else {
        setKartenReihenfolge(normalized.map((s: any) => s.card._id));
      }
    } catch {
      setKartenReihenfolge(normalized.map((s: any) => s.card._id));
    }
  }, [ausgewaehltAthleteId]); // intentionally NOT including athleteStats

  // Sortierte Karten — immer aktuelle entries, aber gespeicherte Reihenfolge
  const sortiertStats = useMemo(() => {
    const normalized = Array.isArray(athleteStats) ? athleteStats.filter((s: any) => s?.card?._id) : [];
    if (kartenReihenfolge.length === 0) return normalized;
    return [...normalized].sort((a, b) => {
      const ai = kartenReihenfolge.indexOf(a.card._id);
      const bi = kartenReihenfolge.indexOf(b.card._id);
      return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
    });
  }, [athleteStats, kartenReihenfolge]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  // Datum-Navigation
  const vorherigerTag = () => {
    const d = new Date(ausgewaehltesDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const nd = toDateStr(d);
    setAusgewaehltesDate(nd);
    if (!tagesFenster.find((t) => t.datumStr === nd)) setFensterOffset((o) => o - 1);
  };
  const naechsterTag = () => {
    if (istHeute) return;
    const d = new Date(ausgewaehltesDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const nd = toDateStr(d);
    if (nd <= TODAY) {
      setAusgewaehltesDate(nd);
      if (!tagesFenster.find((t) => t.datumStr === nd)) setFensterOffset((o) => Math.min(o + 1, 0));
    }
  };
  const datumWaehlen = (ds: string) => {
    setAusgewaehltesDate(ds);
    const diff = Math.round((new Date(ds + "T12:00:00").getTime() - new Date(TODAY + "T12:00:00").getTime()) / 86400000);
    setFensterOffset(Math.min(diff, 0));
  };

  // Zeitraum-Navigation
  const kannVorwaerts = zeitraum.key !== "frei" && zeitraum.offset > 0;
  const zeitraumVerschieben = (richtung: -1 | 1) => {
    setZeitraum((z) => ({ ...z, offset: Math.max(0, z.offset - richtung) }));
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
          <span className="text-white font-medium">SPAQ</span>
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
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Überschrift */}
        <div>
          <h1 className="text-2xl font-semibold text-white">Athleten</h1>
          <p className="text-slate-400 text-sm mt-1">Fortschritt deiner Athleten im Blick</p>
        </div>

        {/* Zeitraum-Auswahl */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => zeitraumVerschieben(-1)} disabled={zeitraum.key === "frei"}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">←</button>

          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
            {ZEITRAEUME.map((z) => (
              <button key={z.key}
                onClick={() => { setZeitraum({ key: z.key, offset: 0 }); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  zeitraum.key === z.key ? "bg-[#FFD300] text-[#0f0f13]" : "text-slate-400 hover:text-white"
                }`}>
                {z.label}
              </button>
            ))}
          </div>

          <button onClick={() => zeitraumVerschieben(1)} disabled={!kannVorwaerts}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">→</button>

          {zeitraum.key !== "frei" && (
            <span className="text-slate-500 text-xs ml-1">{zeitraumLabel(zeitraum)}</span>
          )}
        </div>

        {/* Freier Zeitraum */}
        {zeitraum.key === "frei" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={freiVon} onChange={(e) => setFreiVon(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFD300]/50" />
            <span className="text-slate-500 text-xs">bis</span>
            <input type="date" value={freiBis} onChange={(e) => setFreiBis(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFD300]/50" />
          </div>
        )}

        {/* Athleten-Grid */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : safeRelations.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm">Noch keine Athleten verknüpft</p>
            <p className="text-slate-500 text-xs mt-1">Athleten müssen dir Zugriff über ihr Dashboard gewähren</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {safeRelations.map((rel: any) => {
              const aid      = rel.athleteId._id;
              const aktiv    = aktivitaetMap[aid];
              const gewaehlt = ausgewaehltAthleteId === aid;
              return (
                <button key={rel._id}
                  onClick={() => setAusgewaehltAthleteId((prev) => prev === aid ? null : aid)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    gewaehlt ? "border-[#FFD300]/50 bg-[#FFD300]/5" : "border-white/10 bg-white/3 hover:bg-white/5"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#FFD300]/20 flex items-center justify-center text-[#FFD300] font-semibold text-sm">
                        {rel.athleteId.name.charAt(0).toUpperCase()}
                      </div>
                      {aktiv !== undefined && (
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f0f13] ${
                          aktiv ? "bg-green-400" : "bg-red-400"
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{rel.athleteId.name}</p>
                      <p className={`text-xs ${
                        aktiv === true  ? "text-green-400" :
                        aktiv === false ? "text-red-400"   : "text-slate-400"
                      }`}>
                        {aktiv === true  ? "Aktiv im Zeitraum" :
                         aktiv === false ? "Inaktiv im Zeitraum" :
                         `${rel.allowedMetrics?.length ?? 0} Metriken geteilt`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Athleten-Detail */}
        {ausgewaehltAthleteId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-white font-medium">
                {ausgewaehltRelation?.athleteId?.name}&apos;s Fortschritt
                <span className="text-slate-500 text-sm font-normal ml-2">· {zeitraumLabel(zeitraum)}</span>
              </h2>
              {sortiertStats.length > 1 && (
                <button onClick={() => setAnordneModus((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    anordneModus ? "bg-[#FFD300]/10 border-[#FFD300]/40 text-[#FFD300]" : "bg-transparent border-white/20 text-slate-400 hover:text-white hover:border-white/30"
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {anordneModus ? "Fertig" : "Karten anordnen"}
                </button>
              )}
            </div>

            {sortiertStats.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">Keine geteilten Metriken</p>
              </div>
            ) : anordneModus ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const ids = sortiertStats.map((s: any) => s.card._id);
                  const oi  = ids.indexOf(active.id as string);
                  const ni  = ids.indexOf(over.id as string);
                  const neueIds = arrayMove(ids, oi, ni);
                  setKartenReihenfolge(neueIds);
                  localStorage.setItem(`coach_order_${ausgewaehltAthleteId}`, JSON.stringify(neueIds));
                }}>
                <SortableContext items={sortiertStats.map((s: any) => s.card._id)} strategy={rectSortingStrategy}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sortiertStats.map(({ card, entries }: any) => (
                      <SortierbarKarte key={card._id} card={card} entries={entries}
                        ausgewaehltesdatum={ausgewaehltesDate} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {sortiertStats.map(({ card, entries }: any) => (
                  <AthletKarte key={card._id} card={card} entries={entries}
                    ausgewaehltesdatum={ausgewaehltesDate} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
