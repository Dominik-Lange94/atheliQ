import { useState } from 'react'
import { useAddCard } from '../../hooks/useStats'

const PRESETS = [
  { type: 'heartrate', label: 'Heart Rate', unit: 'bpm',   emoji: '❤️' },
  { type: 'calories',  label: 'Calories',   unit: 'kcal',  emoji: '🔥' },
  { type: 'weight',    label: 'Weight',     unit: 'kg',    emoji: '⚖️' },
  { type: 'steps',     label: 'Steps',      unit: 'steps', emoji: '👟' },
  { type: 'sleep',     label: 'Sleep',      unit: 'hrs',   emoji: '🌙' },
]

const EMOJIS = [
  '🏃','🚴','🏊','⚽','🏋️','🧘','🥊','🎾','🏔️','🚵',
  '🤸','🏄','⛷️','🎿','🧗','🏇','🤾','🏌️','🎯','🏹',
  '💪','🦵','🫀','🧠','😴','🥗','💧','⚡','🔥','❤️',
]

const UNITS = ['km','min','min/km','km/h','reps','sets','kg','kcal','hrs','bpm','steps','m','sec']

interface Props { onClose: () => void }

export default function AddCardModal({ onClose }: Props) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [label, setLabel] = useState('')
  const [unit, setUnit] = useState('')
  const [emoji, setEmoji] = useState('🏃')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Custom "Andere" parameter config
  const [param1Label, setParam1Label] = useState('')
  const [param1Unit, setParam1Unit] = useState('')
  const [param2Label, setParam2Label] = useState('')
  const [param2Unit, setParam2Unit] = useState('')
  const [hasParam2, setHasParam2] = useState(false)

  const addCard = useAddCard()

  const isCustomUnit = unit === 'custom'

  const buildUnit = (): string => {
    if (!isCustomUnit) return unit
    let u = `custom||${param1Label.trim()}:${param1Unit.trim()}`
    if (hasParam2 && param2Label.trim() && param2Unit.trim()) {
      u += `||${param2Label.trim()}:${param2Unit.trim()}`
    }
    return u
  }

  const canSubmit = label.trim() && (
    isCustomUnit
      ? (param1Label.trim() && param1Unit.trim())
      : unit.trim()
  )

  const handleAdd = () => {
    if (!canSubmit) return
    addCard.mutate(
      { type: 'custom', label: `${emoji} ${label.trim()}`, unit: buildUnit() },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add card</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10 mb-5">
          {(['preset', 'custom'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-[#FFD300] text-[#0f0f13]' : 'text-slate-400 hover:text-white'
              }`}>
              {m === 'preset' ? 'Quick add' : 'Custom card'}
            </button>
          ))}
        </div>

        {mode === 'preset' ? (
          <div className="space-y-2">
            {PRESETS.map((p) => (
              <button key={p.type}
                onClick={() => addCard.mutate({ type: p.type as any, label: p.label, unit: p.unit }, { onSuccess: onClose })}
                disabled={addCard.isPending}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all disabled:opacity-50">
                <span className="text-xl">{p.emoji}</span>
                <span className="text-white text-sm flex-1">{p.label}</span>
                <span className="text-slate-400 text-xs">{p.unit}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">

            {/* Emoji */}
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Icon</label>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 hover:border-[#FFD300]/50 text-2xl transition-all flex items-center justify-center">
                {emoji}
              </button>
              {showEmojiPicker && (
                <div className="mt-2 p-3 bg-[#12121a] border border-white/10 rounded-xl grid grid-cols-10 gap-1">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                      className={`text-xl p-1 rounded-lg hover:bg-white/10 transition-all ${
                        emoji === e ? 'bg-[#FFD300]/20 ring-1 ring-[#FFD300]/40' : ''
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Name</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. Running, Cycling, Pullups"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all" />
            </div>

            {/* Einheit */}
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Einheit</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {UNITS.map((u) => (
                  <button key={u} onClick={() => setUnit(u)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      unit === u
                        ? 'bg-[#FFD300] border-[#FFD300] text-[#0f0f13]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                    }`}>
                    {u}
                  </button>
                ))}
                <button onClick={() => setUnit('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isCustomUnit
                      ? 'bg-[#FFD300] border-[#FFD300] text-[#0f0f13]'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                  }`}>
                  Andere…
                </button>
              </div>

              {/* Custom parameter config */}
              {isCustomUnit && (
                <div className="space-y-3 mt-3 p-4 bg-white/3 border border-white/10 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Parameter konfigurieren</p>

                  {/* Param 1 — required */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Parameter 1 <span className="text-[#FFD300]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input value={param1Label} onChange={(e) => setParam1Label(e.target.value)}
                        placeholder="Bezeichnung (z.B. Distanz)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#FFD300]/50 transition-all" />
                      <input value={param1Unit} onChange={(e) => setParam1Unit(e.target.value)}
                        placeholder="Einheit (z.B. km)"
                        className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#FFD300]/50 transition-all" />
                    </div>
                  </div>

                  {/* Param 2 — optional toggle */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-xs text-slate-400">Parameter 2</label>
                      <button
                        onClick={() => setHasParam2(!hasParam2)}
                        className={`w-8 h-4 rounded-full transition-all relative flex-shrink-0 ${hasParam2 ? 'bg-[#FFD300]' : 'bg-white/10'}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${hasParam2 ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <span className="text-xs text-slate-500">optional</span>
                    </div>
                    {hasParam2 && (
                      <div className="flex gap-2">
                        <input value={param2Label} onChange={(e) => setParam2Label(e.target.value)}
                          placeholder="Bezeichnung (z.B. Zeit)"
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#FFD300]/50 transition-all" />
                        <input value={param2Unit} onChange={(e) => setParam2Unit(e.target.value)}
                          placeholder="Einheit (z.B. min)"
                          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#FFD300]/50 transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={addCard.isPending || !canSubmit}
              className="w-full bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] font-medium py-3 rounded-xl transition-colors">
              {addCard.isPending ? 'Wird hinzugefügt…' : `${emoji} ${label || 'Card'} hinzufügen`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
