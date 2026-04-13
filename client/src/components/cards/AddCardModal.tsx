import { useState } from "react";
import { useAddCard } from "../../hooks/useStats";

const PRESETS = [
  { type: "heartrate", label: "Heart Rate", unit: "bpm", emoji: "❤️" },
  { type: "calories", label: "Calories", unit: "kcal", emoji: "🔥" },
  { type: "weight", label: "Weight", unit: "kg", emoji: "⚖️" },
  { type: "steps", label: "Steps", unit: "steps", emoji: "👟" },
  { type: "sleep", label: "Sleep", unit: "hrs", emoji: "🌙" },
];

const EMOJIS = [
  "🏃",
  "🚴",
  "🏊",
  "⚽",
  "🏋️",
  "🧘",
  "🥊",
  "🎾",
  "🏔️",
  "🚵",
  "🤸",
  "🏄",
  "⛷️",
  "🎿",
  "🧗",
  "🏇",
  "🤾",
  "🏌️",
  "🎯",
  "🏹",
  "💪",
  "🦵",
  "🫀",
  "🧠",
  "😴",
  "🥗",
  "💧",
  "⚡",
  "🔥",
  "❤️",
];

const UNITS = [
  "km",
  "min",
  "min/km",
  "km/h",
  "reps",
  "sets",
  "kg",
  "kcal",
  "hrs",
  "bpm",
  "steps",
  "m",
  "sec",
];

interface Props {
  onClose: () => void;
}

export default function AddCardModal({ onClose }: Props) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [emoji, setEmoji] = useState("🏃");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [param1Label, setParam1Label] = useState("");
  const [param1Unit, setParam1Unit] = useState("");
  const [param2Label, setParam2Label] = useState("");
  const [param2Unit, setParam2Unit] = useState("");
  const [hasParam2, setHasParam2] = useState(false);

  const addCard = useAddCard();

  const isCustomUnit = unit === "custom";

  const buildUnit = (): string => {
    if (!isCustomUnit) return unit;
    let u = `custom||${param1Label.trim()}:${param1Unit.trim()}`;
    if (hasParam2 && param2Label.trim() && param2Unit.trim()) {
      u += `||${param2Label.trim()}:${param2Unit.trim()}`;
    }
    return u;
  };

  const canSubmit =
    label.trim() &&
    (isCustomUnit ? param1Label.trim() && param1Unit.trim() : unit.trim());

  const handleAdd = () => {
    if (!canSubmit) return;
    addCard.mutate(
      { type: "custom", label: `${emoji} ${label.trim()}`, unit: buildUnit() },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-subtle bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Add card</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-muted transition-colors hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-subtle bg-surface-2 p-1">
          {(["preset", "custom"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${
                mode === m
                  ? "bg-[#FFD300] text-[#0f0f13]"
                  : "text-muted hover:text-primary"
              }`}
            >
              {m === "preset" ? "Quick add" : "Custom card"}
            </button>
          ))}
        </div>

        {mode === "preset" ? (
          <div className="space-y-2">
            {PRESETS.map((p) => (
              <button
                key={p.type}
                onClick={() =>
                  addCard.mutate(
                    { type: p.type as any, label: p.label, unit: p.unit },
                    { onSuccess: onClose }
                  )
                }
                disabled={addCard.isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-left transition-all disabled:opacity-50 hover:border-strong hover:bg-surface-3"
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="flex-1 text-sm text-primary">{p.label}</span>
                <span className="text-xs text-muted">{p.unit}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-secondary">
                Icon
              </label>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-subtle bg-surface-2 text-2xl transition-all hover:border-[#FFD300]/50"
              >
                {emoji}
              </button>

              {showEmojiPicker && (
                <div className="mt-2 grid grid-cols-10 gap-1 rounded-xl border border-subtle bg-surface-2 p-3">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setEmoji(e);
                        setShowEmojiPicker(false);
                      }}
                      className={`rounded-lg p-1 text-xl transition-all hover:bg-surface-3 ${
                        emoji === e
                          ? "bg-[#FFD300]/20 ring-1 ring-[#FFD300]/40"
                          : ""
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-secondary">
                Name
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. Running, Cycling, Pullups"
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-secondary">
                Einheit
              </label>

              <div className="mb-2 flex flex-wrap gap-2">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      unit === u
                        ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
                        : "border-subtle bg-surface-2 text-secondary hover:border-strong"
                    }`}
                  >
                    {u}
                  </button>
                ))}

                <button
                  onClick={() => setUnit("custom")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    isCustomUnit
                      ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
                      : "border-subtle bg-surface-2 text-secondary hover:border-strong"
                  }`}
                >
                  Andere…
                </button>
              </div>

              {isCustomUnit && (
                <div className="mt-3 space-y-3 rounded-xl border border-subtle bg-surface-2 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Parameter konfigurieren
                  </p>

                  <div>
                    <label className="mb-1.5 block text-xs text-muted">
                      Parameter 1 <span className="text-[#FFD300]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={param1Label}
                        onChange={(e) => setParam1Label(e.target.value)}
                        placeholder="Bezeichnung (z.B. Distanz)"
                        className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all"
                      />
                      <input
                        value={param1Unit}
                        onChange={(e) => setParam1Unit(e.target.value)}
                        placeholder="Einheit (z.B. km)"
                        className="w-24 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <label className="text-xs text-muted">Parameter 2</label>
                      <button
                        onClick={() => setHasParam2(!hasParam2)}
                        className={`relative flex h-4 w-8 flex-shrink-0 rounded-full transition-all ${
                          hasParam2 ? "bg-[#FFD300]" : "bg-surface-3"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                            hasParam2 ? "left-4" : "left-0.5"
                          }`}
                        />
                      </button>
                      <span className="text-xs text-muted">optional</span>
                    </div>

                    {hasParam2 && (
                      <div className="flex gap-2">
                        <input
                          value={param2Label}
                          onChange={(e) => setParam2Label(e.target.value)}
                          placeholder="Bezeichnung (z.B. Zeit)"
                          className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all"
                        />
                        <input
                          value={param2Unit}
                          onChange={(e) => setParam2Unit(e.target.value)}
                          placeholder="Einheit (z.B. min)"
                          className="w-24 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={addCard.isPending || !canSubmit}
              className="w-full rounded-xl bg-[#FFD300] py-3 font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
            >
              {addCard.isPending
                ? "Wird hinzugefügt…"
                : `${emoji} ${label || "Card"} hinzufügen`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
