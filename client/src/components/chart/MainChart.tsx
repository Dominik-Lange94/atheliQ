import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { useCardEntries } from '../../hooks/useStats'

interface Card {
  _id: string
  label: string
  unit: string
  type: string
  chartType?: string
  color?: string
}

interface Props {
  cards: Card[]
  selectedCardIds: string[]
  selectedDate?: string // ISO date string e.g. "2024-01-15"
}

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: 'rose', calories: 'orange', weight: 'blue',
  steps: 'green', sleep: 'purple', custom: 'yellow',
}

const COLOR_HEX: Record<string, string> = {
  rose: '#f43f5e', orange: '#f97316', amber: '#f59e0b',
  green: '#22c55e', teal: '#14b8a6', blue: '#3b82f6',
  indigo: '#6366f1', purple: '#a855f7', pink: '#ec4899', yellow: '#FFD300',
}

const TIME_RANGES = [
  { key: '1D', label: '1T', days: 1 },
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '1Y', label: '1J', days: 365 },
  { key: 'custom', label: 'Frei', days: 0 },
]

function getCardColor(card?: Card): string {
  if (!card) return '#FFD300'
  const key = card.color ?? DEFAULT_COLORS[card.type] ?? 'yellow'
  return COLOR_HEX[key] ?? '#FFD300'
}

function getCleanLabel(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, '')
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

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function MainChart({ cards, selectedCardIds, selectedDate }: Props) {
  const selectedCards = cards.filter((c) => selectedCardIds.includes(c._id))
  const [activeCard, setActiveCard] = useState<string>('')
  const [weightGoal, setWeightGoal] = useState<'lose' | 'gain'>('lose')
  const [timeRange, setTimeRange] = useState<string>('1M')
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toDateStr(d)
  })
  const [customTo, setCustomTo] = useState<string>(toDateStr(new Date()))
  const [showCustom, setShowCustom] = useState(false)

  const displayCard = selectedCards.find((c) => c._id === activeCard) ?? selectedCards[0]
  const cardColor = getCardColor(displayCard)

  // Compute from/to based on selected range
  const { from, to } = useMemo(() => {
    if (timeRange === 'custom') {
      return { from: customFrom, to: customTo }
    }
    const range = TIME_RANGES.find((r) => r.key === timeRange)
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - (range?.days ?? 30))
    return { from: toDateStr(fromDate), to: toDateStr(toDate) }
  }, [timeRange, customFrom, customTo])

  const { data: entries, isLoading } = useCardEntries(
    displayCard?._id ?? null,
    { from, to }
  )

  if (!selectedCards.length) {
    return (
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Karten unten auswählen um sie im Chart anzuzeigen</p>
      </div>
    )
  }

  const isPaceCard   = displayCard?.unit === 'min/km'
  const isSpeedCard  = displayCard?.unit === 'km/h'
  const isWeightCard = displayCard?.unit === 'kg'
  const chartType    = displayCard?.chartType ?? 'line'

  const chartData = (entries ?? []).map((e: any) => {
    let displayValue = e.value
    if (isPaceCard && e.secondaryValue && e.value)
      displayValue = +(e.secondaryValue / e.value).toFixed(2)
    else if (isSpeedCard && e.secondaryValue && e.value)
      displayValue = +(e.value / (e.secondaryValue / 60)).toFixed(1)

    const dateLabel = new Date(e.recordedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    const dateISO   = toDateStr(new Date(e.recordedAt))
    return { date: dateLabel, dateISO, value: displayValue, _real: displayValue }
  })

  const maxVal = chartData.length ? Math.max(...chartData.map((d) => d.value)) : 0
  const minVal = chartData.length ? Math.min(...chartData.map((d) => d.value)) : 0

  const shouldInvert = (isWeightCard && weightGoal === 'lose') || isPaceCard
  const displayData = shouldInvert
    ? chartData.map((d) => ({ ...d, value: +(maxVal + minVal - d.value).toFixed(2) }))
    : chartData

  const displayUnit = getDisplayUnit(displayCard?.unit ?? '')

  // Find selected date label for ReferenceLine
  const selectedDateLabel = selectedDate
    ? displayData.find((d) => d.dateISO === selectedDate)?.date
    : null

  const rangeLabel = timeRange === 'custom'
    ? `${customFrom} – ${customTo}`
    : TIME_RANGES.find((r) => r.key === timeRange)?.label

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-5">

      {/* Card selector tabs */}
      {selectedCards.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {selectedCards.map((card) => {
            const isActive = displayCard?._id === card._id
            const hex = getCardColor(card)
            return (
              <button key={card._id} onClick={() => setActiveCard(card._id)}
                style={isActive ? { borderColor: `${hex}50`, backgroundColor: `${hex}15`, color: hex } : {}}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isActive ? '' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                {getCleanLabel(card.label)}
              </button>
            )
          })}
        </div>
      )}

      {/* Title + controls row */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-white font-medium">{getCleanLabel(displayCard?.label ?? '')}</h2>
          <p className="text-slate-400 text-xs">{displayUnit} · {rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isWeightCard && (
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
              <button onClick={() => setWeightGoal('lose')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${weightGoal === 'lose' ? 'bg-[#FFD300] text-[#0f0f13]' : 'text-slate-400 hover:text-white'}`}>
                📉 Lose
              </button>
              <button onClick={() => setWeightGoal('gain')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${weightGoal === 'gain' ? 'bg-[#FFD300] text-[#0f0f13]' : 'text-slate-400 hover:text-white'}`}>
                📈 Gain
              </button>
            </div>
          )}

          {/* Time range selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
            {TIME_RANGES.map((r) => (
              <button key={r.key}
                onClick={() => { setTimeRange(r.key); if (r.key === 'custom') setShowCustom(true) }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  timeRange === r.key ? 'bg-[#FFD300] text-[#0f0f13]' : 'text-slate-400 hover:text-white'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom date range */}
      {timeRange === 'custom' && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFD300]/50" />
          <span className="text-slate-500 text-xs">bis</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFD300]/50" />
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${cardColor}40`, borderTopColor: cardColor }} />
        </div>
      ) : displayData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Keine Daten im gewählten Zeitraum</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={displayData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#1e1e2e', border: `1px solid ${cardColor}30`, borderRadius: '12px', color: '#e2e8f0', fontSize: '13px' }}
              formatter={(_v: any, _n: any, props: any) => [
                <span style={{ color: cardColor }}>{props.payload._real} {displayUnit}</span>,
                getCleanLabel(displayCard?.label ?? ''),
              ]}
            />

            {/* Highlight selected day */}
            {selectedDateLabel && (
              <ReferenceLine
                x={selectedDateLabel}
                stroke={cardColor}
                strokeWidth={2}
                strokeOpacity={0.8}
                strokeDasharray="4 3"
                label={{ value: '●', position: 'top', fill: cardColor, fontSize: 10 }}
              />
            )}

            {(chartType === 'bar' || chartType === 'mixed') && (
              <Bar dataKey="value" fill={cardColor} fillOpacity={chartType === 'mixed' ? 0.3 : 0.75} radius={[3, 3, 0, 0]} maxBarSize={32} />
            )}
            {(chartType === 'line' || chartType === 'mixed') && (
              <Line type="monotone" dataKey="value" stroke={cardColor} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: cardColor }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
