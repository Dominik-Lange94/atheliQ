import { useState } from "react";
import {
  IoHeartOutline, IoFlameOutline, IoScaleOutline,
  IoFootstepsOutline, IoMoonOutline,
  IoWalkOutline, IoBicycleOutline, IoWaterOutline,
  IoBarbellOutline, IoBodyOutline, IoFitnessOutline,
  IoLeafOutline, IoSpeedometerOutline, IoTimerOutline,
  IoTrophyOutline, IoTrendingUpOutline, IoNutritionOutline,
  IoMedicalOutline, IoStarOutline, IoFlashOutline,
  IoInfiniteOutline, IoCheckmarkCircleOutline, IoAddOutline,
  IoChevronDownOutline, IoGridOutline,
  IoPencilOutline, IoCloseOutline, IoCheckmarkOutline,
  IoOpenOutline, IoTrashOutline, IoRemoveOutline,
} from "react-icons/io5";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  run: IoWalkOutline, bicycle: IoBicycleOutline, barbell: IoBarbellOutline,
  fitness: IoFitnessOutline, body: IoBodyOutline, heart: IoHeartOutline,
  flame: IoFlameOutline, scale: IoScaleOutline, footsteps: IoFootstepsOutline,
  moon: IoMoonOutline, water: IoWaterOutline, leaf: IoLeafOutline,
  speedo: IoSpeedometerOutline, timer: IoTimerOutline, trophy: IoTrophyOutline,
  trending: IoTrendingUpOutline, nutrition: IoNutritionOutline,
  medical: IoMedicalOutline, star: IoStarOutline, flash: IoFlashOutline,
  infinite: IoInfiniteOutline, check: IoCheckmarkCircleOutline,
  add: IoAddOutline, down: IoChevronDownOutline,
  // built-in type icons
  heartrate: IoHeartOutline, calories: IoFlameOutline, weight: IoScaleOutline,
  steps: IoFootstepsOutline, sleep: IoMoonOutline, custom: IoGridOutline,
};

function getCardIcon(card: { type: string; label: string }): ComponentType<{ className?: string }> {
  // Check for [iconKey] prefix from AddCardModal
  const match = card.label.match(/^\[([a-z]+)\]/);
  if (match && ICON_MAP[match[1]]) return ICON_MAP[match[1]];
  // Fall back to type
  return ICON_MAP[card.type] ?? IoGridOutline;
}

function getCleanCardLabel(label: string): string {
  return label.replace(/^\[[a-z]+\]\s*/, '').replace(/^\p{Emoji}\s*/u, '');
}
import {
  useUpdateWeight,
  useRemoveCard,
  useLogEntry,
  useEditCard,
} from "../../hooks/useStats";
import CustomCardTable from "./CustomCardTable";

interface Props {
  card: {
    _id: string;
    type: string;
    label: string;
    unit: string;
    color?: string;
    chartType?: string;
    goalEnabled?: boolean;
    goalValue?: number | null;
    goalDirection?: "lose" | "gain" | "min" | "max" | null;
  };
  latest: { value: number; recordedAt: string; secondaryValue?: number } | null;
  selected: boolean;
  onToggleSelect: () => void;
  selectedDate?: string;
}

const COLOR_OPTIONS = [
  {
    key: "rose",
    from: "from-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  {
    key: "orange",
    from: "from-orange-500/10",
    border: "border-orange-500/20",
    dot: "bg-orange-400",
  },
  {
    key: "amber",
    from: "from-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  {
    key: "green",
    from: "from-green-500/10",
    border: "border-green-500/20",
    dot: "bg-green-400",
  },
  {
    key: "teal",
    from: "from-teal-500/10",
    border: "border-teal-500/20",
    dot: "bg-teal-400",
  },
  {
    key: "blue",
    from: "from-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  {
    key: "indigo",
    from: "from-indigo-500/10",
    border: "border-indigo-500/20",
    dot: "bg-indigo-400",
  },
  {
    key: "purple",
    from: "from-purple-500/10",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
  },
  {
    key: "pink",
    from: "from-pink-500/10",
    border: "border-pink-500/20",
    dot: "bg-pink-400",
  },
  {
    key: "yellow",
    from: "from-[#FFD300]/10",
    border: "border-[#FFD300]/20",
    dot: "bg-[#FFD300]",
  },
];

const CHART_TYPES = [
  {
    key: "line",
    label: "Linie",
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="h-6 w-10">
        <polyline
          points="2,20 10,12 18,15 26,6 38,10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "bar",
    label: "Balken",
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="h-6 w-10">
        <rect
          x="3"
          y="10"
          width="6"
          height="12"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
        <rect
          x="12"
          y="6"
          width="6"
          height="16"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
        <rect
          x="21"
          y="12"
          width="6"
          height="10"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
        <rect
          x="30"
          y="4"
          width="6"
          height="18"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    key: "mixed",
    label: "Mix",
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="h-6 w-10">
        <rect
          x="3"
          y="12"
          width="5"
          height="10"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="11"
          y="8"
          width="5"
          height="14"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="19"
          y="14"
          width="5"
          height="8"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="27"
          y="6"
          width="5"
          height="16"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <polyline
          points="2,20 10,12 18,15 26,6 38,10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: "rose",
  calories: "orange",
  weight: "blue",
  steps: "green",
  sleep: "purple",
  custom: "yellow",
};

function getColorClasses(key: string) {
  return COLOR_OPTIONS.find((o) => o.key === key) ?? COLOR_OPTIONS[9];
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

function getDisplayValue(
  value: number,
  unit: string,
  secondaryValue?: number
): string {
  if (unit === "min/km" && secondaryValue && value)
    return (secondaryValue / value).toFixed(2);
  if (unit === "km/h" && secondaryValue && value)
    return (value / (secondaryValue / 60)).toFixed(1);
  const num = parseFloat(String(value));
  if (isNaN(num)) return "—";
  return parseFloat(num.toFixed(2)).toString();
}

export default function StatCard({
  card,
  latest,
  selected,
  onToggleSelect,
  selectedDate,
}: Props) {
  const updateWeight = useUpdateWeight();
  const removeCard = useRemoveCard();
  const logEntry = useLogEntry();
  const editCard = useEditCard();

  const isCustom    = card.type === "custom";
  const isWeight    = card.type === "weight";
  const CardIcon    = getCardIcon(card);
  const displayLabel = getCleanCardLabel(card.label);
  const displayUnit  = getDisplayUnit(card.unit);

  const [localColor, setLocalColor] = useState(
    card.color ?? DEFAULT_COLORS[card.type] ?? "yellow"
  );
  const [localLabel, setLocalLabel] = useState(displayLabel);
  const [localChartType, setLocalChartType] = useState(
    card.chartType ?? "line"
  );
  const [localGoalEnabled, setLocalGoalEnabled] = useState(
    Boolean(card.goalEnabled)
  );
  const [localGoalValue, setLocalGoalValue] = useState<number | null>(
    typeof card.goalValue === "number" ? card.goalValue : null
  );
  const [localGoalDirection, setLocalGoalDirection] = useState<
    "lose" | "gain" | "min" | "max" | null
  >(card.goalDirection ?? (isWeight ? "lose" : "min"));

  const colorOption = getColorClasses(localColor);

  const [showTable, setShowTable] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(
    selectedDate ?? new Date().toISOString().split("T")[0]
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editLabel, setEditLabel] = useState(displayLabel);
  const [editColor, setEditColor] = useState(localColor);
  const [editChartType, setEditChartType] = useState(localChartType);
  const [editGoalEnabled, setEditGoalEnabled] = useState(
    Boolean(card.goalEnabled)
  );
  const [editGoalValue, setEditGoalValue] = useState(
    typeof card.goalValue === "number" ? String(card.goalValue) : ""
  );
  const [editGoalDirection, setEditGoalDirection] = useState<
    "lose" | "gain" | "min" | "max"
  >((card.goalDirection as any) ?? (isWeight ? "lose" : "min"));

  const openEdit = () => {
    setEditLabel(localLabel);
    setEditColor(localColor);
    setEditChartType(localChartType);
    setEditGoalEnabled(localGoalEnabled);
    setEditGoalValue(
      typeof localGoalValue === "number" ? String(localGoalValue) : ""
    );
    setEditGoalDirection(
      (localGoalDirection as any) ?? (isWeight ? "lose" : "min")
    );
    setShowEdit(true);
  };

  const handleSaveEdit = () => {
    const newLabel = isCustom
      ? editLabel.trim()
      : editLabel.trim();

    const parsedGoalValue =
      editGoalEnabled && editGoalValue.trim() !== ""
        ? parseFloat(editGoalValue)
        : null;

    setLocalLabel(editLabel.trim());
    setLocalColor(editColor);
    setLocalChartType(editChartType);
    setLocalGoalEnabled(editGoalEnabled);
    setLocalGoalValue(
      typeof parsedGoalValue === "number" && !Number.isNaN(parsedGoalValue)
        ? parsedGoalValue
        : null
    );
    setLocalGoalDirection(editGoalEnabled ? editGoalDirection : null);
    setShowEdit(false);

    editCard.mutate({
      id: card._id,
      label: newLabel,
      color: editColor,
      chartType: editChartType,
      goalEnabled: editGoalEnabled,
      goalValue:
        typeof parsedGoalValue === "number" && !Number.isNaN(parsedGoalValue)
          ? parsedGoalValue
          : null,
      goalDirection: editGoalEnabled ? editGoalDirection : null,
    });
  };

  const handleManualWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val)) return;

    logEntry.mutate(
      {
        cardId: card._id,
        value: val,
        recordedAt: new Date(dateInput + "T12:00:00").toISOString(),
      },
      {
        onSuccess: () => {
          setWeightInput("");
          setShowWeightInput(false);
        },
      }
    );
  };

  const handleDelta = (delta: number) => {
    updateWeight.mutate({ delta, date: selectedDate });
  };

  const previewColor = getColorClasses(editColor);

  return (
    <>
      <div
        className={`relative group rounded-2xl border bg-gradient-to-br ${
          colorOption.from
        } ${colorOption.border} p-4 transition-all ${
          selected ? "ring-2 ring-[#FFD300]/50" : ""
        } ${isCustom ? "cursor-pointer" : ""}`}
        onClick={isCustom ? () => setShowTable(true) : undefined}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute right-16 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
            selected
              ? "border-[#FFD300] bg-[#FFD300]"
              : "border-subtle bg-surface/70 hover:border-strong"
          }`}
        >
          {selected && (
            <IoCheckmarkOutline className="h-3.5 w-3.5 text-[#0f0f13]" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit();
          }}
          className="absolute right-9 top-2.5 flex h-6 w-6 items-center justify-center text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-[#FFD300]"
          title="Bearbeiten"
        >
          <IoPencilOutline className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmRemove(true);
          }}
          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400"
          title="Entfernen"
        >
          <IoCloseOutline className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-subtle bg-surface/50"><CardIcon className="h-5 w-5 text-secondary" /></div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-wider text-muted">
              {localLabel}
            </p>

            <p className="mt-0.5 text-2xl font-semibold text-primary">
              {latest?.value != null
                ? getDisplayValue(
                    latest.value,
                    card.unit,
                    latest.secondaryValue
                  )
                : "—"}
              <span className="ml-1 text-sm font-normal text-muted">
                {displayUnit}
              </span>
            </p>

            {latest?.recordedAt && (
              <p className="mt-1 text-xs text-muted">
                {new Date(latest.recordedAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                })}
              </p>
            )}

            {localGoalEnabled && typeof localGoalValue === "number" && (
              <p className="mt-1 text-[10px] text-[#c99700] dark:text-[#FFD300]/80">
                Ziel: {localGoalValue} {displayUnit}
              </p>
            )}
          </div>
        </div>

        {isCustom && (
          <div className="mt-2 border-t border-subtle pt-2">
            <p className="text-xs text-[#c99700] dark:text-[#FFD300]/70">
              Tippen zum Öffnen →
            </p>
          </div>
        )}

        {isWeight && (
          <div className="mt-3 space-y-2 border-t border-subtle pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelta(-0.1);
                }}
                disabled={updateWeight.isPending}
                className="flex-1 rounded-lg border border-subtle bg-surface px-0 py-1.5 text-sm font-medium text-primary transition-colors hover:border-strong hover:bg-surface-2 disabled:opacity-50"
              >
                − 0.1
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelta(0.1);
                }}
                disabled={updateWeight.isPending}
                className="flex-1 rounded-lg border border-subtle bg-surface px-0 py-1.5 text-sm font-medium text-primary transition-colors hover:border-strong hover:bg-surface-2 disabled:opacity-50"
              >
                + 0.1
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWeightInput(!showWeightInput);
                }}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  showWeightInput
                    ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
                    : "border-subtle bg-surface text-secondary hover:border-strong"
                }`}
              >
                ✏️
              </button>
            </div>

            {selectedDate && (
              <p className="text-center text-[10px] text-muted">
                {selectedDate === new Date().toISOString().split("T")[0]
                  ? "Heute"
                  : new Date(selectedDate + "T12:00:00").toLocaleDateString(
                      "de-DE",
                      { day: "2-digit", month: "short" }
                    )}
              </p>
            )}

            {showWeightInput && (
              <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`${latest?.value ?? "70"} kg`}
                  step="0.1"
                  className="w-full rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                />

                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
                  />

                  <button
                    onClick={handleManualWeight}
                    disabled={logEntry.isPending || !weightInput}
                    className="rounded-lg bg-[#FFD300] px-3 py-1.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
                  >
                    {logEntry.isPending ? "…" : "OK"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-subtle bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-primary">Karte bearbeiten</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-xl leading-none text-muted transition hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm text-secondary">
                Titel
              </label>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-2.5 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none transition-all"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-secondary">Farbe</label>
              <div className="mb-3 grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setEditColor(c.key)}
                    className={`flex h-9 items-center justify-center rounded-lg border transition-all ${
                      editColor === c.key
                        ? "border-strong bg-surface-3"
                        : "border-subtle bg-surface-2 hover:border-strong"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${c.dot}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-secondary">
                Diagramm-Typ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => setEditChartType(ct.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all ${
                      editChartType === ct.key
                        ? "border-[#FFD300]/50 bg-[#FFD300]/10 text-[#FFD300]"
                        : "border-subtle bg-surface-2 text-muted hover:border-strong hover:text-primary"
                    }`}
                  >
                    {ct.icon}
                    <span className="text-xs font-medium">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm text-secondary">Ziel</label>

              <div className="space-y-3 rounded-xl border border-subtle bg-surface-2 p-3">
                <label className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={editGoalEnabled}
                    onChange={(e) => setEditGoalEnabled(e.target.checked)}
                  />
                  Ziel für diese Karte aktivieren
                </label>

                {editGoalEnabled && (
                  <>
                    <input
                      type="number"
                      value={editGoalValue}
                      onChange={(e) => setEditGoalValue(e.target.value)}
                      placeholder={`Zielwert in ${displayUnit}`}
                      step="0.1"
                      className="w-full rounded-xl border border-subtle bg-surface px-4 py-2.5 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {(isWeight
                        ? [
                            { key: "lose", label: "📉 Abnehmen" },
                            { key: "gain", label: "📈 Zunehmen" },
                          ]
                        : [
                            { key: "min", label: "⬆ Mindestziel" },
                            { key: "max", label: "⬇ Obergrenze" },
                          ]
                      ).map((option) => (
                        <button
                          key={option.key}
                          onClick={() =>
                            setEditGoalDirection(option.key as any)
                          }
                          className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                            editGoalDirection === option.key
                              ? "border-[#FFD300]/50 bg-[#FFD300]/10 text-[#FFD300]"
                              : "border-subtle bg-surface text-muted hover:border-strong hover:text-primary"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              className={`mb-5 flex items-center gap-2 rounded-xl border bg-gradient-to-br p-3 ${previewColor.from} ${previewColor.border}`}
            >
              <CardIcon className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium text-primary">
                {editLabel || localLabel}
              </span>
              <span className="ml-auto text-xs text-muted">
                {CHART_TYPES.find((c) => c.key === editChartType)?.label}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 rounded-xl border border-subtle bg-surface-2 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-strong hover:text-primary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editCard.isPending || !editLabel.trim()}
                className="flex-1 rounded-xl bg-[#FFD300] py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
              >
                {editCard.isPending ? "…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-xl">
                🗑️
              </div>
              <div>
                <h3 className="font-semibold text-primary">Karte entfernen?</h3>
                <p className="mt-0.5 text-xs text-muted">{localLabel}</p>
              </div>
            </div>

            <p className="mb-5 text-sm text-secondary">
              Sind Sie sicher? Alle gespeicherten Daten dieser Karte werden{" "}
              <span className="font-medium text-red-500 dark:text-red-400">
                unwiderruflich gelöscht
              </span>{" "}
              und können nicht wiederhergestellt werden.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(false)}
                className="flex-1 rounded-xl border border-subtle bg-surface-2 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-strong hover:text-primary"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  removeCard.mutate(card._id);
                  setConfirmRemove(false);
                }}
                disabled={removeCard.isPending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {removeCard.isPending ? "Löschen…" : "Ja, löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTable && (
        <CustomCardTable card={card} onClose={() => setShowTable(false)} />
      )}
    </>
  );
}
