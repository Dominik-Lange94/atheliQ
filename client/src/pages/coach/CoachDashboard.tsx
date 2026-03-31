import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useCoachAthletes, useAthleteStats } from '../../hooks/useStats'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e']

export default function CoachDashboard() {
  const { user, logout } = useAuth()
  const { data: relations = [], isLoading } = useCoachAthletes()
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const { data: athleteStats = [] } = useAthleteStats(selectedAthleteId)

  const selectedRelation = relations.find((r: any) => r.athleteId._id === selectedAthleteId)

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Header */}
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
          <p className="text-slate-400 text-sm mt-1">Monitor your athletes' progress</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : relations.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm">No athletes linked yet</p>
            <p className="text-slate-500 text-xs mt-1">Athletes need to grant you access from their dashboard</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {relations.map((rel: any) => (
              <button
                key={rel._id}
                onClick={() => setSelectedAthleteId(rel.athleteId._id)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  selectedAthleteId === rel.athleteId._id
                    ? 'border-[#FFD300]/50 bg-[#FFD300]/5'
                    : 'border-white/10 bg-white/3 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FFD300]/20 flex items-center justify-center text-[#FFD300] font-semibold text-sm">
                    {rel.athleteId.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{rel.athleteId.name}</p>
                    <p className="text-slate-400 text-xs">{rel.allowedMetrics?.length ?? 0} metrics shared</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Athlete stats */}
        {selectedAthleteId && (
          <div className="space-y-5">
            <h2 className="text-white font-medium">
              {selectedRelation?.athleteId?.name}'s progress
            </h2>

            {athleteStats.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">No shared metrics yet</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {athleteStats.map(({ card, entries }: any, i: number) => {
                  const chartData = entries.map((e: any) => ({
                    date: new Date(e.recordedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
                    value: e.value,
                  }))
                  const latest = entries[entries.length - 1]
                  const first = entries[0]
                  const trend = latest && first ? +(latest.value - first.value).toFixed(2) : null

                  return (
                    <div key={card._id} className="bg-white/3 border border-white/10 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-white font-medium text-sm">{card.label}</p>
                          <p className="text-slate-400 text-xs">{card.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{latest?.value ?? '—'}</p>
                          {trend !== null && (
                            <p className={`text-xs ${trend < 0 ? 'text-green-400' : trend > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                              {trend > 0 ? '+' : ''}{trend} total
                            </p>
                          )}
                        </div>
                      </div>

                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: '12px' }}
                            formatter={(v: any) => [`${v} ${card.unit}`, card.label]}
                          />
                          <Line type="monotone" dataKey="value" stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
