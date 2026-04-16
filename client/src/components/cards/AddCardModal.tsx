import { useState } from "react";
import { useAddCard } from "../../hooks/useStats";
import {
  IoAlarmOutline, IoAmericanFootballOutline, IoBandageOutline,
  IoBarbellOutline, IoBasketballOutline, IoBedOutline, IoBeerOutline,
  IoBicycleOutline, IoBoatOutline, IoBodyOutline, IoBonfireOutline,
  IoBuildOutline, IoCloseOutline, IoCompassOutline, IoCreateOutline,
  IoDiceOutline, IoEarthOutline, IoEyedropOutline, IoFishOutline,
  IoFitnessOutline, IoFlagOutline, IoFlameOutline, IoFlashOutline,
  IoFlowerOutline, IoFootballOutline, IoFootstepsOutline,
  IoGameControllerOutline, IoGlobeOutline, IoGolfOutline, IoGridOutline,
  IoHeartOutline, IoIceCreamOutline, IoInfiniteOutline, IoLeafOutline,
  IoLocationOutline, IoMapOutline, IoMedalOutline, IoMedicalOutline,
  IoMoonOutline, IoNutritionOutline, IoPawOutline, IoPulseOutline,
  IoRibbonOutline, IoRocketOutline, IoRoseOutline, IoScaleOutline,
  IoSnowOutline, IoSpeedometerOutline, IoStarOutline, IoStopwatchOutline,
  IoSunnyOutline, IoTennisballOutline, IoThermometerOutline,
  IoThumbsDownOutline, IoThumbsUpOutline, IoTimerOutline,
  IoTrendingDownOutline, IoTrendingUpOutline, IoTrophyOutline,
  IoWalkOutline, IoWaterOutline,
} from "react-icons/io5";
import type { ComponentType } from "react";

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { type: "heartrate", label: "Herzrate",  unit: "bpm",   Icon: IoHeartOutline    },
  { type: "calories",  label: "Kalorien",  unit: "kcal",  Icon: IoFlameOutline    },
  { type: "weight",    label: "Gewicht",   unit: "kg",    Icon: IoScaleOutline    },
  { type: "steps",     label: "Schritte",  unit: "steps", Icon: IoFootstepsOutline },
  { type: "sleep",     label: "Schlaf",    unit: "hrs",   Icon: IoMoonOutline     },
];

// ─── Icon options ─────────────────────────────────────────────────────────────

const ICON_OPTIONS: { key: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  // Sport & Bewegung
  { key: "walk",       label: "Gehen",       Icon: IoWalkOutline           },
  { key: "bicycle",    label: "Fahrrad",      Icon: IoBicycleOutline        },
  { key: "barbell",    label: "Gewichte",     Icon: IoBarbellOutline        },
  { key: "fitness",    label: "Fitness",      Icon: IoFitnessOutline        },
  { key: "football",   label: "Fußball",      Icon: IoFootballOutline       },
  { key: "basketball", label: "Basketball",   Icon: IoBasketballOutline     },
  { key: "tennisball", label: "Tennis",       Icon: IoTennisballOutline     },
  { key: "americanfb", label: "American Fb.", Icon: IoAmericanFootballOutline },
  { key: "golf",       label: "Golf",         Icon: IoGolfOutline           },
  { key: "boat",       label: "Rudern",       Icon: IoBoatOutline           },
  { key: "stopwatch",  label: "Stoppuhr",     Icon: IoStopwatchOutline      },
  { key: "timer",      label: "Timer",        Icon: IoTimerOutline          },
  { key: "compass",    label: "Kompass",      Icon: IoCompassOutline        },
  { key: "flag",       label: "Flagge",       Icon: IoFlagOutline           },
  { key: "trophy",     label: "Pokal",        Icon: IoTrophyOutline         },
  { key: "medal",      label: "Medaille",     Icon: IoMedalOutline          },
  { key: "ribbon",     label: "Ribbon",       Icon: IoRibbonOutline         },
  // Körper & Gesundheit
  { key: "heart",      label: "Herz",         Icon: IoHeartOutline          },
  { key: "pulse",      label: "Puls",         Icon: IoPulseOutline          },
  { key: "body",       label: "Körper",       Icon: IoBodyOutline           },
  { key: "footsteps",  label: "Schritte",     Icon: IoFootstepsOutline      },
  { key: "bandage",    label: "Verband",      Icon: IoBandageOutline        },
  { key: "medical",    label: "Medizin",      Icon: IoMedicalOutline        },
  { key: "nutrition",  label: "Ernährung",    Icon: IoNutritionOutline      },
  { key: "scale",      label: "Waage",        Icon: IoScaleOutline          },
  { key: "thermometer",label: "Temperatur",   Icon: IoThermometerOutline    },
  { key: "eyedrop",    label: "Augentropfen", Icon: IoEyedropOutline        },
  // Lifestyle
  { key: "flame",      label: "Feuer",        Icon: IoFlameOutline          },
  { key: "moon",       label: "Schlaf",       Icon: IoMoonOutline           },
  { key: "bed",        label: "Bett",         Icon: IoBedOutline            },
  { key: "water",      label: "Wasser",       Icon: IoWaterOutline          },
  { key: "leaf",       label: "Natur",        Icon: IoLeafOutline           },
  { key: "flower",     label: "Blume",        Icon: IoFlowerOutline         },
  { key: "sun",        label: "Sonne",        Icon: IoSunnyOutline          },
  { key: "snow",       label: "Schnee",       Icon: IoSnowOutline           },
  { key: "earth",      label: "Erde",         Icon: IoEarthOutline          },
  { key: "bonfire",    label: "Lagerfeuer",   Icon: IoBonfireOutline        },
  // Stats & Trends
  { key: "trending",   label: "Aufsteigend",  Icon: IoTrendingUpOutline     },
  { key: "trenddown",  label: "Absteigend",   Icon: IoTrendingDownOutline   },
  { key: "speedo",     label: "Tempo",        Icon: IoSpeedometerOutline    },
  { key: "star",       label: "Stern",        Icon: IoStarOutline           },
  { key: "flash",      label: "Blitz",        Icon: IoFlashOutline          },
  { key: "rocket",     label: "Rakete",       Icon: IoRocketOutline         },
  { key: "infinite",   label: "Unendlich",    Icon: IoInfiniteOutline       },
  { key: "alarm",      label: "Alarm",        Icon: IoAlarmOutline          },
  // Allgemein
  { key: "thumbup",    label: "Daumen hoch",  Icon: IoThumbsUpOutline       },
  { key: "thumbdown",  label: "Daumen runter",Icon: IoThumbsDownOutline     },
  { key: "grid",       label: "Raster",       Icon: IoGridOutline           },
  { key: "map",        label: "Karte",        Icon: IoMapOutline            },
  { key: "globe",      label: "Globus",       Icon: IoGlobeOutline          },
  { key: "location",   label: "Standort",     Icon: IoLocationOutline       },
  { key: "create",     label: "Erstellen",    Icon: IoCreateOutline         },
  { key: "build",      label: "Bauen",        Icon: IoBuildOutline          },
  { key: "paw",        label: "Pfote",        Icon: IoPawOutline            },
  { key: "fish",       label: "Fisch",        Icon: IoFishOutline           },
  { key: "rose",       label: "Rose",         Icon: IoRoseOutline           },
  { key: "dice",       label: "Würfel",       Icon: IoDiceOutline           },
  { key: "game",       label: "Spiel",        Icon: IoGameControllerOutline },
  { key: "beer",       label: "Bier",         Icon: IoBeerOutline           },
  { key: "icecream",   label: "Eis",          Icon: IoIceCreamOutline       },
];

const UNITS = ["km", "min", "min/km", "km/h", "reps", "sets", "kg", "kcal", "hrs", "bpm", "steps", "m", "sec"];

interface Props { onClose: () => void }

export default function AddCardModal({ onClose }: Props) {
  const [mode, setMode]               = useState<"preset" | "custom">("preset");
  const [label, setLabel]             = useState("");
  const [unit, setUnit]               = useState("");
  const [iconKey, setIconKey]         = useState("walk");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch]   = useState("");

  const [param1Label, setParam1Label] = useState("");
  const [param1Unit, setParam1Unit]   = useState("");
  const [param2Label, setParam2Label] = useState("");
  const [param2Unit, setParam2Unit]   = useState("");
  const [hasParam2, setHasParam2]     = useState(false);

  const addCard = useAddCard();
  const isCustomUnit = unit === "custom";

  const buildUnit = (): string => {
    if (!isCustomUnit) return unit;
    let u = `custom||${param1Label.trim()}:${param1Unit.trim()}`;
    if (hasParam2 && param2Label.trim() && param2Unit.trim())
      u += `||${param2Label.trim()}:${param2Unit.trim()}`;
    return u;
  };

  const canSubmit = label.trim() && (isCustomUnit ? param1Label.trim() && param1Unit.trim() : unit.trim());

  const handleAdd = () => {
    if (!canSubmit) return;
    addCard.mutate(
      { type: "custom", label: `[${iconKey}] ${label.trim()}`, unit: buildUnit() },
      { onSuccess: onClose }
    );
  };

  const SelectedIcon = ICON_OPTIONS.find((o) => o.key === iconKey)?.Icon ?? IoGridOutline;

  const filteredIcons = iconSearch.trim()
    ? ICON_OPTIONS.filter((o) => o.label.toLowerCase().includes(iconSearch.toLowerCase()) || o.key.includes(iconSearch.toLowerCase()))
    : ICON_OPTIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-subtle bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Karte hinzufügen</h2>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-primary">
            <IoCloseOutline className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-subtle bg-surface-2 p-1">
          {(["preset", "custom"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${
                mode === m ? "bg-[#FFD300] text-[#0f0f13]" : "text-muted hover:text-primary"
              }`}>
              {m === "preset" ? "Schnell hinzufügen" : "Eigene Karte"}
            </button>
          ))}
        </div>

        {mode === "preset" ? (
          <div className="space-y-2">
            {PRESETS.map((p) => (
              <button key={p.type}
                onClick={() => addCard.mutate({ type: p.type as any, label: p.label, unit: p.unit }, { onSuccess: onClose })}
                disabled={addCard.isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-left transition-all disabled:opacity-50 hover:border-strong hover:bg-surface-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-subtle bg-surface">
                  <p.Icon className="h-5 w-5 text-secondary" />
                </div>
                <span className="flex-1 text-sm text-primary">{p.label}</span>
                <span className="text-xs text-muted">{p.unit}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Icon picker */}
            <div>
              <label className="mb-1.5 block text-sm text-secondary">Icon</label>
              <button onClick={() => setShowIconPicker(!showIconPicker)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-subtle bg-surface-2 transition-all hover:border-[#FFD300]/50">
                <SelectedIcon className="h-6 w-6 text-primary" />
              </button>

              {showIconPicker && (
                <div className="mt-2 rounded-xl border border-subtle bg-surface-2 p-3">
                  <input
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Suchen…"
                    className="mb-3 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                  />
                  <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                    {filteredIcons.map(({ key, label: iconLabel, Icon }) => (
                      <button key={key}
                        onClick={() => { setIconKey(key); setShowIconPicker(false); setIconSearch(""); }}
                        title={iconLabel}
                        className={`flex items-center justify-center rounded-lg p-2 transition-all hover:bg-surface-3 ${
                          iconKey === key ? "bg-[#FFD300]/20 ring-1 ring-[#FFD300]/40" : ""
                        }`}>
                        <Icon className={`h-5 w-5 ${iconKey === key ? "text-[#FFD300]" : "text-secondary"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm text-secondary">Name</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. Laufen, Radfahren, Liegestütze"
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all" />
            </div>

            {/* Unit */}
            <div>
              <label className="mb-1.5 block text-sm text-secondary">Einheit</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {UNITS.map((u) => (
                  <button key={u} onClick={() => setUnit(u)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      unit === u ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]" : "border-subtle bg-surface-2 text-secondary hover:border-strong"
                    }`}>
                    {u}
                  </button>
                ))}
                <button onClick={() => setUnit("custom")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    isCustomUnit ? "border-[#FFD300] bg-[#FFD300] text-[#0f0f13]" : "border-subtle bg-surface-2 text-secondary hover:border-strong"
                  }`}>
                  Andere…
                </button>
              </div>

              {isCustomUnit && (
                <div className="mt-3 space-y-3 rounded-xl border border-subtle bg-surface-2 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Parameter konfigurieren</p>
                  <div>
                    <label className="mb-1.5 block text-xs text-muted">Parameter 1 <span className="text-[#FFD300]">*</span></label>
                    <div className="flex gap-2">
                      <input value={param1Label} onChange={(e) => setParam1Label(e.target.value)}
                        placeholder="Bezeichnung (z.B. Distanz)"
                        className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all" />
                      <input value={param1Unit} onChange={(e) => setParam1Unit(e.target.value)}
                        placeholder="Einheit (z.B. km)"
                        className="w-24 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <label className="text-xs text-muted">Parameter 2</label>
                      <button onClick={() => setHasParam2(!hasParam2)}
                        className={`relative flex h-4 w-8 flex-shrink-0 rounded-full transition-all ${hasParam2 ? "bg-[#FFD300]" : "bg-surface-3"}`}>
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${hasParam2 ? "left-4" : "left-0.5"}`} />
                      </button>
                      <span className="text-xs text-muted">optional</span>
                    </div>
                    {hasParam2 && (
                      <div className="flex gap-2">
                        <input value={param2Label} onChange={(e) => setParam2Label(e.target.value)}
                          placeholder="Bezeichnung (z.B. Zeit)"
                          className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all" />
                        <input value={param2Unit} onChange={(e) => setParam2Unit(e.target.value)}
                          placeholder="Einheit (z.B. min)"
                          className="w-24 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleAdd} disabled={addCard.isPending || !canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD300] py-3 font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40">
              <SelectedIcon className="h-4 w-4" />
              {addCard.isPending ? "Wird hinzugefügt…" : `${label || "Karte"} hinzufügen`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
