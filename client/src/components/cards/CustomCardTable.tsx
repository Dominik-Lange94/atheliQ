import { useState } from 'react'
import { useCardEntries, useLogEntry, useDeleteEntry } from '../../hooks/useStats'

interface Props {
  card: { _id: string; label: string; unit: string; type: string }
  onClose: () => void
}

function parseUnit(unit: string) {
  if (!unit.startsWith('custom||')) {
    if (unit === 'min/km') return { param1: { label: 'Distanz', unit: 'km' }, param2: { label: 'Zeit', unit: 'min' } }
    if (unit === 'km/h')   return { param1: { label: 'Distanz', unit: 'km' }, param2: { label: 'Zeit', unit: 'min' } }
    return { param1: { label: 'Wert', unit }, param2: null }
  }
  const parts = unit.split('||').slice(1)
  const p1 = parts[0]?.split(':') ?? []
  const p2 = parts[1]?.split(':') ?? []
  return {
    param1: { label: p1[0]?.trim() ?? 'Wert', unit: p1[1]?.trim() ?? '' },
    param2: p2.length === 2 ? { label: p2[0]?.trim(), unit: p2[1]?.trim() } : null,
  }
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

function getCleanLabel(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, '')
}

export default function CustomCardTable({ card, onClose }: Props) {
  const { data: entries = [], isLoading } = useCardEntries(card._id)
  const logEntry = useLogEntry()
  const deleteEntry = useDeleteEntry()

  const { param1, param2 } = parseUnit(card.unit)
  const isPace  = card.unit === 'min/km'
  const isSpeed = card.unit === 'km/h'

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [val1, setVal1] = useState('')
  const [val2, setVal2] = useState('')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const pace  = isPace  && val1 && val2 ? (parseFloat(val2) / parseFloat(val1)).toFixed(2) : null
  const speed = isSpeed && val1 && val2 ? (parseFloat(val1) / (parseFloat(val2) / 60)).toFixed(1) : null

  const handleAdd = () => {
    if (!val1) return
    logEntry.mutate({
      cardId: card._id,
      value: parseFloat(val1),
      secondaryValue: val2 ? parseFloat(val2) : undefined,
      note: note || undefined,
      recordedAt: new Date(date).toISOString(),
    }, { onSuccess: () => { setVal1(''); setVal2(''); setNote('') } })
  }

  const handleDelete = (entryId: string) => {
    deleteEntry.mutate({ entryId, cardId: card._id }, {
      onSuccess: () => setConfirmDelete(null)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">{getCleanLabel(card.label)}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{getDisplayUnit(card.unit)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Add entry form */}
        <div className="bg-white/3 border border-white/10 rounded-xl p-4 mb-5">
          <p className="text-sm text-slate-300 font-medium mb-3">Neuer Eintrag</p>
          <div className={`grid gap-3 ${param2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Datum</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD300]/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {param1.label}
                {param1.unit && <span className="text-slate-600 ml-1">({param1.unit})</span>}
                <span className="text-[#FFD300] ml-1">*</span>
              </label>
              <input type="number" value={val1} onChange={(e) => setVal1(e.target.value)}
                placeholder="0" step="any" min="0"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD300]/50 placeholder-slate-600" />
            </div>
            {param2 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {param2.label}
                  {param2.unit && <span className="text-slate-600 ml-1">({param2.unit})</span>}
                  <span className="text-slate-500 ml-1 text-xs">optional</span>
                </label>
                <input type="number" value={val2} onChange={(e) => setVal2(e.target.value)}
                  placeholder="0" step="any" min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD300]/50 placeholder-slate-600" />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notiz</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD300]/50 placeholder-slate-600" />
            </div>
          </div>

          {pace  && <div className="mt-3 flex items-center gap-2"><span className="text-xs text-slate-400">Pace:</span><span className="text-sm font-semibold text-[#FFD300]">{pace} min/km</span></div>}
          {speed && <div className="mt-3 flex items-center gap-2"><span className="text-xs text-slate-400">Ø Speed:</span><span className="text-sm font-semibold text-[#FFD300]">{speed} km/h</span></div>}

          <button onClick={handleAdd} disabled={logEntry.isPending || !val1}
            className="mt-3 px-5 py-2 bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] text-sm font-medium rounded-lg transition-colors">
            {logEntry.isPending ? 'Speichern…' : '+ Hinzufügen'}
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />)}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">Noch keine Einträge.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-slate-400 font-medium pb-2 pr-4">Datum</th>
                  <th className="text-right text-xs text-slate-400 font-medium pb-2 pr-4">
                    {param1.label}{param1.unit ? ` (${param1.unit})` : ''}
                  </th>
                  {param2 && (
                    <th className="text-right text-xs text-slate-400 font-medium pb-2 pr-4">
                      {param2.label}{param2.unit ? ` (${param2.unit})` : ''}
                    </th>
                  )}
                  {(isPace || isSpeed) && (
                    <th className="text-right text-xs text-slate-400 font-medium pb-2 pr-4">
                      {isPace ? 'Pace' : 'Ø Speed'}
                    </th>
                  )}
                  <th className="text-left text-xs text-slate-400 font-medium pb-2">Notiz</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...entries].reverse().map((entry: any) => {
                  const calcPace  = isPace  && entry.secondaryValue && entry.value ? (entry.secondaryValue / entry.value).toFixed(2) : null
                  const calcSpeed = isSpeed && entry.secondaryValue && entry.value ? (entry.value / (entry.secondaryValue / 60)).toFixed(1) : null

                  return (
                    <tr key={entry._id} className="hover:bg-white/3 transition-colors group">
                      <td className="py-2.5 pr-4 text-slate-300">
                        {new Date(entry.recordedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-white font-medium">
                        {entry.value} {param1.unit}
                      </td>
                      {param2 && (
                        <td className="py-2.5 pr-4 text-right text-slate-300">
                          {entry.secondaryValue ? `${entry.secondaryValue} ${param2.unit}` : '—'}
                        </td>
                      )}
                      {isPace  && <td className="py-2.5 pr-4 text-right">{calcPace  ? <span className="text-[#FFD300] font-medium">{calcPace} min/km</span> : '—'}</td>}
                      {isSpeed && <td className="py-2.5 pr-4 text-right">{calcSpeed ? <span className="text-[#FFD300] font-medium">{calcSpeed} km/h</span>  : '—'}</td>}
                      <td className="py-2.5 text-slate-500 text-xs">{entry.note || ''}</td>
                      <td className="py-2.5 text-right">
                        {confirmDelete === entry._id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleDelete(entry._id)} disabled={deleteEntry.isPending}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded border border-red-500/30 hover:border-red-400/50 transition-all disabled:opacity-50">
                              Ja
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded border border-white/10 transition-all">
                              Nein
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(entry._id)}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-base leading-none"
                            title="Eintrag löschen">✕
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
