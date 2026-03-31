import { useState } from 'react'
import { useMyCoaches, useSearchCoach, useConnectCoach, useUpdatePermissions, useDisconnectCoach } from '../../hooks/useCoach'
import { useCards } from '../../hooks/useStats'

function getDisplayUnit(unit: string): string {
  if (!unit.startsWith('custom||')) return unit
  const parts = unit.split('||').slice(1)
  const p1 = parts[0]?.split(':') ?? []
  const p2 = parts[1]?.split(':') ?? []
  const u1 = p1[1]?.trim() ?? ''
  const u2 = p2[1]?.trim() ?? ''
  if (u1 && u2) return `${u1} / ${u2}`
  if (u1) return u1
  // fallback: show param label instead
  const l1 = p1[0]?.trim() ?? ''
  return l1 || '—'
}

function getCleanLabel(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, '')
}

export default function CoachesPage({ onClose }: { onClose: () => void }) {
  const { data: coaches = [], isLoading } = useMyCoaches()
  const { data: cards = [] } = useCards()
  const searchCoach = useSearchCoach()
  const connectCoach = useConnectCoach()
  const updatePermissions = useUpdatePermissions()
  const disconnectCoach = useDisconnectCoach()

  const [email, setEmail] = useState('')
  const [foundCoach, setFoundCoach] = useState<any>(null)
  const [searchError, setSearchError] = useState('')
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)

  const handleSearch = async () => {
    setFoundCoach(null)
    setSearchError('')
    try {
      const result = await searchCoach.mutateAsync(email.trim())
      setFoundCoach(result)
    } catch (err: any) {
      setSearchError(err.response?.data?.error ?? 'Fehler bei der Suche')
    }
  }

  const handleConnect = async () => {
    if (!foundCoach) return
    try {
      await connectCoach.mutateAsync(foundCoach._id)
      setFoundCoach(null)
      setEmail('')
    } catch (err: any) {
      setSearchError(err.response?.data?.error ?? 'Verbindung fehlgeschlagen')
    }
  }

  const toggleMetric = async (coachId: string, cardId: string, currentAllowed: string[]) => {
    const updated = currentAllowed.includes(cardId)
      ? currentAllowed.filter((id) => id !== cardId)
      : [...currentAllowed, cardId]
    await updatePermissions.mutateAsync({ coachId, allowedMetrics: updated })
  }

  const handleDisconnect = async (coachId: string) => {
    await disconnectCoach.mutateAsync(coachId)
    setConfirmDisconnect(null)
    setExpandedCoachId(null)
  }

  return (
    <div className="fixed inset-0 bg-[#0f0f13] z-40 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            ←
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Meine Coaches</h1>
            <p className="text-slate-400 text-sm">Verwalte wer deine Daten sehen darf</p>
          </div>
        </div>

        {/* Add coach section */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-medium mb-4">Coach hinzufügen</h2>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFoundCoach(null); setSearchError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Email-Adresse des Coaches"
              type="email"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={!email.trim() || searchCoach.isPending}
              className="px-4 py-2.5 bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] font-medium rounded-xl transition-colors text-sm"
            >
              {searchCoach.isPending ? '…' : 'Suchen'}
            </button>
          </div>

          {searchError && (
            <p className="text-red-400 text-sm mt-2">{searchError}</p>
          )}

          {foundCoach && (
            <div className="mt-3 flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center text-[#FFD300] font-semibold text-sm">
                  {foundCoach.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{foundCoach.name}</p>
                  <p className="text-slate-400 text-xs">{foundCoach.email}</p>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={connectCoach.isPending}
                className="px-3 py-1.5 bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-40 text-[#0f0f13] text-xs font-medium rounded-lg transition-colors"
              >
                {connectCoach.isPending ? '…' : 'Verbinden'}
              </button>
            </div>
          )}
        </div>

        {/* Coach list */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(2)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
          ) : coaches.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">🏋️</p>
              <p className="text-slate-400 text-sm">Noch kein Coach verbunden</p>
              <p className="text-slate-500 text-xs mt-1">Suche oben nach der Email deines Coaches</p>
            </div>
          ) : (
            coaches.map((rel: any) => {
              const coach = rel.coachId
              const allowed: string[] = rel.allowedMetrics?.map((id: any) => id.toString()) ?? []
              const isExpanded = expandedCoachId === coach._id

              return (
                <div key={rel._id} className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
                  {/* Coach header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center text-[#FFD300] font-semibold">
                      {coach.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{coach.name}</p>
                      <p className="text-slate-400 text-xs">{coach.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                        {allowed.length} / {cards.length} Metriken
                      </span>
                      <button
                        onClick={() => setExpandedCoachId(isExpanded ? null : coach._id)}
                        className="px-3 py-1.5 text-xs border border-white/10 text-slate-300 hover:text-white hover:border-white/20 rounded-lg transition-all"
                      >
                        {isExpanded ? 'Einklappen' : 'Berechtigungen'}
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  {isExpanded && (
                    <div className="border-t border-white/10 px-4 py-4">
                      <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider">Sichtbare Metriken</p>
                      {cards.length === 0 ? (
                        <p className="text-slate-500 text-sm">Keine Karten vorhanden</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {cards.map((card: any) => {
                            const isAllowed = allowed.includes(card._id)
                            return (
                              <button
                                key={card._id}
                                onClick={() => toggleMetric(coach._id, card._id, allowed)}
                                disabled={updatePermissions.isPending}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                                  isAllowed
                                    ? 'bg-[#FFD300]/10 border-[#FFD300]/30'
                                    : 'bg-white/3 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  isAllowed ? 'bg-[#FFD300] border-[#FFD300]' : 'border-white/20'
                                }`}>
                                  {isAllowed && (
                                    <svg className="w-2.5 h-2.5 text-[#0f0f13]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-xs font-medium truncate ${isAllowed ? 'text-white' : 'text-slate-300'}`}>
                                    {getCleanLabel(card.label)}
                                  </p>
                                  <p className="text-xs text-slate-500">{getDisplayUnit(card.unit)}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Disconnect */}
                      {confirmDisconnect === coach._id ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <p className="text-sm text-slate-300 flex-1">Coach wirklich entfernen?</p>
                          <button onClick={() => handleDisconnect(coach._id)} disabled={disconnectCoach.isPending}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                            Ja, entfernen
                          </button>
                          <button onClick={() => setConfirmDisconnect(null)}
                            className="px-3 py-1.5 border border-white/10 text-slate-300 text-xs rounded-lg hover:border-white/20 transition-all">
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDisconnect(coach._id)}
                          className="mt-2 text-xs text-red-400/70 hover:text-red-400 transition-colors">
                          Coach entfernen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
