import { useState } from 'react'
import { useUpdateWeight, useRemoveCard, useLogEntry, useEditCard } from '../../hooks/useStats'
import CustomCardTable from './CustomCardTable'

interface Props {
  card: { _id: string; type: string; label: string; unit: string; color?: string; chartType?: string }
  latest: { value: number; recordedAt: string; secondaryValue?: number } | null
  selected: boolean
  onToggleSelect: () => void
  selectedDate?: string  // current calendar date from dashboard
}

const COLOR_OPTIONS = [
  { key: 'rose',   from: 'from-rose-500/10',   border: 'border-rose-500/20',   dot: 'bg-rose-400' },
  { key: 'orange', from: 'from-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  { key: 'amber',  from: 'from-amber-500/10',  border: 'border-amber-500/20',  dot: 'bg-amber-400' },
  { key: 'green',  from: 'from-green-500/10',  border: 'border-green-500/20',  dot: 'bg-green-400' },
  { key: 'teal',   from: 'from-teal-500/10',   border: 'border-teal-500/20',   dot: 'bg-teal-400' },
  { key: 'blue',   from: 'from-blue-500/10',   border: 'border-blue-500/20',   dot: 'bg-blue-400' },
  { key: 'indigo', from: 'from-indigo-500/10', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
  { key: 'purple', from: 'from-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-400' },
  { key: 'pink',   from: 'from-pink-500/10',   border: 'border-pink-500/20',   dot: 'bg-pink-400' },
  { key: 'yellow', from: 'from-[#FFD300]/10',  border: 'border-[#FFD300]/20',  dot: 'bg-[#FFD300]' },
]

const CHART_TYPES = [
  {
    key: 'line', label: 'Linie',
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="w-10 h-6">
        <polyline points="2,20 10,12 18,15 26,6 38,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'bar', label: 'Balken',
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="w-10 h-6">
        <rect x="3"  y="10" width="6" height="12" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="12" y="6"  width="6" height="16" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="21" y="12" width="6" height="10" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="30" y="4"  width="6" height="18" rx="1" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    key: 'mixed', label: 'Mix',
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="w-10 h-6">
        <rect x="3"  y="12" width="5" height="10" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="11" y="8"  width="5" height="14" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="19" y="14" width="5" height="8"  rx="1" fill="currentColor" opacity="0.5" />
        <rect x="27" y="6"  width="5" height="16" rx="1" fill="currentColor" opacity="0.5" />
        <polyline points="2,20 10,12 18,15 26,6 38,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: 'rose', calories: 'orange', weight: 'blue',
  steps: 'green', sleep: 'purple', custom: 'yellow',
}

function getColorClasses(key: string) {
  return COLOR_OPTIONS.find((o) => o.key === key) ?? COLOR_OPTIONS[9]
}
function getEmoji(label: string): string {
  const match = label.match(/^\p{Emoji}/u)
  return match ? match[0] : '📊'
}
function getCleanLabel(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, '')
}
function getDefaultEmoji(type: string): string {
  const map: Record<string, string> = { heartrate: '❤️', calories: '🔥', weight: '⚖️', steps: '👟', sleep: '🌙' }
  return map[type] ?? '📊'
}
function getDisplayUnit(unit: string): string {
  if (!unit.startsWith('custom||')) return unit
  const parts = unit.split('||').slice(1)
  const p1 = parts[0]?.split(':') ?? []
  const p2 = parts[1]?.split(':') ?? []
  const u1 = p1[1]?.trim() ?? ''
  const u2 = p2[1]?.trim() ?? ''
  if (u1 && u2) return `${u1} / ${u2}`
  if (u1) return u1
  return p1[0]?.trim() || '—'
}
function getDisplayValue(value: number, unit: string, secondaryValue?: number): string {
  if (unit === 'min/km' && secondaryValue && value) return (secondaryValue / value).toFixed(2)
  if (unit === 'km/h'   && secondaryValue && value) return (value / (secondaryValue / 60)).toFixed(1)
  const num = parseFloat(String(value))
  if (isNaN(num)) return '—'
  return parseFloat(num.toFixed(2)).toString()
}

export default function StatCard({ card, latest, selected, onToggleSelect, selectedDate }: Props) {
  const updateWeight = useUpdateWeight()
  const removeCard   = useRemoveCard()
  const logEntry     = useLogEntry()
  const editCard     = useEditCard()

  const isCustom     = card.type === 'custom'
  const isWeight     = card.type === 'weight'
  const emoji        = isCustom ? getEmoji(card.label) : getDefaultEmoji(card.type)
  const displayLabel = isCustom ? getCleanLabel(card.label) : card.label
  const displayUnit  = getDisplayUnit(card.unit)

  const [localColor,     setLocalColor]     = useState(card.color ?? DEFAULT_COLORS[card.type] ?? 'yellow')
  const [localLabel,     setLocalLabel]     = useState(displayLabel)
  const [localChartType, setLocalChartType] = useState(card.chartType ?? 'line')

  const colorOption = getColorClasses(localColor)

  const [showTable,       setShowTable]       = useState(false)
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [weightInput,     setWeightInput]     = useState('')
  const [dateInput,       setDateInput]       = useState(selectedDate ?? new Date().toISOString().split('T')[0])
  const [confirmRemove,   setConfirmRemove]   = useState(false)
  const [showEdit,        setShowEdit]        = useState(false)
  const [editLabel,       setEditLabel]       = useState(displayLabel)
  const [editColor,       setEditColor]       = useState(localColor)
  const [editChartType,   setEditChartType]   = useState(localChartType)

  const openEdit = () => {
    setEditLabel(localLabel)
    setEditColor(localColor)
    setEditChartType(localChartType)
    setShowEdit(true)
  }

  const handleSaveEdit = () => {
    const newLabel = isCustom ? `${emoji} ${editLabel.trim()}` : editLabel.trim()
    setLocalLabel(editLabel.trim())
    setLocalColor(editColor)
    setLocalChartType(editChartType)
    setShowEdit(false)
    editCard.mutate({ id: card._id, label: newLabel, color: editColor, chartType: editChartType })
  }

  const handleManualWeight = () => {
    const val = parseFloat(weightInput)
    if (isNaN(val)) return
    logEntry.mutate({
      cardId: card._id,
      value: val,
      recordedAt: new Date(dateInput + 'T12:00:00').toISOString(),
    }, { onSuccess: () => { setWeightInput(''); setShowWeightInput(false) } })
  }

  // Weight +/- always uses the selected calendar date
  const handleDelta = (delta: number) => {
    updateWeight.mutate({ delta, date: selectedDate })
  }

  const previewColor = getColorClasses(editColor)

  return (
    <>
      <div
        className={`relative group rounded-2xl border bg-gradient-to-br ${colorOption.from} ${colorOption.border} p-4 transition-all ${selected ? 'ring-2 ring-[#FFD300]/50' : ''} ${isCustom ? 'cursor-pointer' : ''}`}
        onClick={isCustom ? () => setShowTable(true) : undefined}
      >
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
          className={`absolute top-3 right-16 w-5 h-5 rounded-full border transition-all ${selected ? 'bg-[#FFD300] border-[#FFD300]' : 'border-white/20 hover:border-white/40'}`}>
          {selected && <svg className="w-3 h-3 text-[#0f0f13] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </button>

        <button onClick={(e) => { e.stopPropagation(); openEdit() }}
          className="absolute top-3 right-9 w-5 h-5 text-slate-500 hover:text-[#FFD300] opacity-0 group-hover:opacity-100 transition-all text-sm leading-none"
          title="Bearbeiten">✎</button>

        <button onClick={(e) => { e.stopPropagation(); setConfirmRemove(true) }}
          className="absolute top-3 right-3 w-5 h-5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          title="Entfernen">✕</button>

        <div className="flex items-start gap-3">
          <span className="text-2xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider truncate">{localLabel}</p>
            <p className="text-2xl font-semibold text-white mt-0.5">
              {latest?.value != null ? getDisplayValue(latest.value, card.unit, latest.secondaryValue) : '—'}
              <span className="text-sm font-normal text-slate-400 ml-1">{displayUnit}</span>
            </p>
            {latest?.recordedAt && (
              <p className="text-xs text-slate-500 mt-1">
                {new Date(latest.recordedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              </p>
            )}
          </div>
        </div>

        {isCustom && <div className="mt-2 pt-2 border-t border-white/10"><p className="text-xs text-[#FFD300]/70">Tippen zum Öffnen →</p></div>}

        {isWeight && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleDelta(-0.1) }} disabled={updateWeight.isPending}
                className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors text-sm disabled:opacity-50">− 0.1</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelta(0.1) }} disabled={updateWeight.isPending}
                className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors text-sm disabled:opacity-50">+ 0.1</button>
              <button onClick={(e) => { e.stopPropagation(); setShowWeightInput(!showWeightInput) }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${showWeightInput ? 'bg-[#FFD300] border-[#FFD300] text-[#0f0f13]' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'}`}>✏️</button>
            </div>

            {/* Show which date the +/- applies to */}
            {selectedDate && (
              <p className="text-[10px] text-slate-600 text-center">
                {selectedDate === new Date().toISOString().split('T')[0]
                  ? 'Heute'
                  : new Date(selectedDate + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              </p>
            )}

            {showWeightInput && (
              <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`${latest?.value ?? '70'} kg`} step="0.1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFD300]/50 placeholder-slate-600" />
                <div className="flex gap-2">
                  <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFD300]/50" />
                  <button onClick={handleManualWeight} disabled={logEntry.isPending || !weightInput}
                    className="px-3 py-1.5 bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] text-sm rounded-lg transition-colors font-medium">
                    {logEntry.isPending ? '…' : 'OK'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Karte bearbeiten</h3>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1.5">Titel</label>
              <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD300]/50 transition-all text-sm" />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Farbe</label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c.key} onClick={() => setEditColor(c.key)}
                    className={`flex items-center justify-center h-9 rounded-lg border transition-all ${editColor === c.key ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
                    <span className={`w-4 h-4 rounded-full ${c.dot}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-2">Diagramm-Typ</label>
              <div className="grid grid-cols-3 gap-2">
                {CHART_TYPES.map((ct) => (
                  <button key={ct.key} onClick={() => setEditChartType(ct.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                      editChartType === ct.key
                        ? 'border-[#FFD300]/50 bg-[#FFD300]/10 text-[#FFD300]'
                        : 'border-white/10 bg-white/3 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}>
                    {ct.icon}
                    <span className="text-xs font-medium">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={`mb-5 p-3 rounded-xl border bg-gradient-to-br ${previewColor.from} ${previewColor.border} flex items-center gap-2`}>
              <span className="text-lg">{emoji}</span>
              <span className="text-white text-sm font-medium">{editLabel || localLabel}</span>
              <span className="ml-auto text-xs text-slate-400">{CHART_TYPES.find(c => c.key === editChartType)?.label}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEdit(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-colors">
                Abbrechen
              </button>
              <button onClick={handleSaveEdit} disabled={editCard.isPending || !editLabel.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] text-sm font-medium transition-colors">
                {editCard.isPending ? '…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm remove */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl">🗑️</div>
              <div>
                <h3 className="text-white font-semibold">Karte entfernen?</h3>
                <p className="text-slate-400 text-xs mt-0.5">{localLabel}</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-5">
              Sind Sie sicher? Alle gespeicherten Daten dieser Karte werden{' '}
              <span className="text-red-400 font-medium">unwiderruflich gelöscht</span> und können nicht wiederhergestellt werden.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-colors">
                Abbrechen
              </button>
              <button onClick={() => { removeCard.mutate(card._id); setConfirmRemove(false) }} disabled={removeCard.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {removeCard.isPending ? 'Löschen…' : 'Ja, löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTable && <CustomCardTable card={card} onClose={() => setShowTable(false)} />}
    </>
  )
}
