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
  selectedDate?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { key: '1D', label: '1T',  days: 1 },
  { key: '1W', label: '1W',  days: 7 },
  { key: '1M', label: '1M',  days: 30 },
  { key: '3M', label: '3M',  days: 90 },
  { key: '1Y', label: '1J',  days: 365 },
  { key: 'custom', label: 'Frei', days: 0 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCardColor(card?: Card): string {
  if (!card) return '#FFD300'
  const key = card.color ?? DEFAULT_COLORS[card.type] ?? 'yellow'
  return COLOR_HEX[key] ?? '#FFD300'
}

function stripEmoji(label: string): string {
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

// Expanding moving average — starts from point 0, never returns null
function movingAverage(data: number[], windowSize: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1)
    const slice = data.slice(start, i + 1)
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MainChart({ cards, selectedCardIds, selectedDate }: Props) {
  const selectedCards = cards.filter((c) => selectedCardIds.includes(c._id))

  const [activeCardId, setActiveCardId]     = useState<string>('')
  const [weightGoal, setWeightGoal]         = useState<'lose' | 'gain'>('lose')
  const [timeRange, setTimeRange]           = useState<string>('1M')
  const [customFrom, setCustomFrom]         = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return toDateStr(d)
  })
  const [customTo, setCustomTo]             = useState<string>(toDateStr(new Date()))

  // Goal line
  const [goalActive, setGoalActive]         = useState(false)
  const [goalValue, setGoalValue]           = useState<number>(0)

  // Trend line
  const [trendActive, setTrendActive]       = useState(false)
  const [trendWindow, setTrendWindow]       = useState<number>(7)

  const displayCard = selectedCards.find((c) => c._id === activeCardId) ?? selectedCards[0]
  const cardColor   = getCardColor(displayCard)

  // Compute date range
  const { from, to } = useMemo(() => {
    if (timeRange === 'custom') return { from: customFrom, to: customTo }
    const range   = TIME_RANGES.find((r) => r.key === timeRange)
    const toDate  = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - (range?.days ?? 30))
    return { from: toDateStr(fromDate), to: toDateStr(toDate) }
  }, [timeRange, customFrom, customTo])

  const { data: entries, isLoading } = useCardEntries(displayCard?._id ?? null, { from, to })

  if (!selectedCards.length) {
    return (
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Karten unten auswählen um sie im Diagramm anzuzeigen</p>
      </div>
    )
  }

  const isPaceCard   = displayCard?.unit === 'min/km'
  const isSpeedCard  = displayCard?.unit === 'km/h'
  const isWeightCard = displayCard?.unit === 'kg'
  const chartType    = displayCard?.chartType ?? 'line'
  const displayUnit  = getDisplayUnit(displayCard?.unit ?? '')

  // Map entries to chart values
  const rawData = (entries ?? []).map((e: any) => {
    let value = e.value
    if (isPaceCard  && e.secondaryValue && e.value) value = +(e.secondaryValue / e.value).toFixed(2)
    if (isSpeedCard && e.secondaryValue && e.value) value = +(e.value / (e.secondaryValue / 60)).toFixed(1)
    return {
      date:    new Date(e.recordedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
      dateISO: toDateStr(new Date(e.recordedAt)),
      value,
      _real: value,
    }
  })

  const maxVal = rawData.length ? Math.max(...rawData.map((d) => d.value)) : 100
  const minVal = rawData.length ? Math.min(...rawData.map((d) => d.value)) : 0

  // Invert Y axis for "lose weight" and pace (lower = better displayed higher)
  const shouldInvert = isPaceCard
  const displayData  = shouldInvert
    ? rawData.map((d) => ({ ...d, value: +(maxVal + minVal - d.value).toFixed(2) }))
    : rawData

  // Trend line (moving average on display values)
  const trendValues = trendActive
    ? movingAverage(displayData.map((d) => d.value), Math.min(trendWindow, displayData.length))
    : []

  const chartData = displayData.map((d, i) => ({
    ...d,
    trend: trendActive ? trendValues[i] : undefined,
  }))

  // Selected day reference line
  const selectedDateLabel = selectedDate
    ? chartData.find((d) => d.dateISO === selectedDate)?.date
    : null

  // Goal line: invert the goal value for display when axis is inverted
  const goalDisplayValue = shouldInvert ? maxVal + minVal - goalValue : goalValue

  // Slider range based on real data
  const sliderMin  = Math.floor(minVal * 0.9)
  const sliderMax  = Math.ceil(maxVal * 1.1)
  const sliderStep = (sliderMax - sliderMin) > 100
    ? Math.round((sliderMax - sliderMin) / 100)
    : 0.1

  // Goal achievement stats (based on raw values)
  const goalMet = rawData.filter((d) =>
    weightGoal === 'gain' ? d.value >= goalValue : d.value <= goalValue
  ).length
  const goalPct = rawData.length > 0 ? Math.round((goalMet / rawData.length) * 100) : 0

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
            const hex      = getCardColor(card)
            return (
              <button key={card._id} onClick={() => setActiveCardId(card._id)}
                style={isActive ? { borderColor: `${hex}50`, backgroundColor: `${hex}15`, color: hex } : {}}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isActive ? '' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                {stripEmoji(card.label)}
              </button>
            )
          })}
        </div>
      )}

      {/* Title + controls */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-white font-medium">{stripEmoji(displayCard?.label ?? '')}</h2>
          <p className="text-slate-400 text-xs">{displayUnit} · {rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isWeightCard && (
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
              <button onClick={() => setWeightGoal('lose')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${weightGoal === 'lose' ? 'bg-[#FFD300] text-[#0f0f13]' : 'text-slate-400 hover:text-white'}`}>
                📉 Abnehmen
              </button>
              <button onClick={() => setWeightGoal('gain')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${weightGoal === 'gain' ? 'bg-[#FFD300] text-[#0f0f13]' : 'text-slate-400 hover:text-white'}`}>
                📈 Zunehmen
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
            {TIME_RANGES.map((r) => (
              <button key={r.key} onClick={() => setTimeRange(r.key)}
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

      {/* Extra options: goal line + trend line */}
      {!isLoading && chartData.length > 0 && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <button
            onClick={() => {
              setGoalActive((v) => !v)
              if (!goalActive) setGoalValue(Math.round((maxVal + minVal) / 2))
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              goalActive
                ? 'border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]'
                : 'border-white/10 text-slate-400 hover:text-white'
            }`}>
            <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: goalActive ? '#FFD300' : '#64748b' }} />
            Ziel
          </button>

          <button
            onClick={() => setTrendActive((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              trendActive
                ? 'border-white/30 bg-white/5 text-white'
                : 'border-white/10 text-slate-400 hover:text-white'
            }`}>
            <span className="w-4 h-0.5 inline-block rounded-full" style={{ backgroundColor: trendActive ? 'rgba(255,255,255,0.6)' : '#64748b' }} />
            Trendlinie
          </button>

          {trendActive && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs">Glättung</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white/5 border border-white/10 rounded-lg">
                {[3, 5, 7, 14].map((n) => (
                  <button key={n} onClick={() => setTrendWindow(n)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                      trendWindow === n ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'
                    }`}>{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Goal slider */}
      {goalActive && !isLoading && chartData.length > 0 && (
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">Zielwert</span>
            <span className="text-xs font-medium text-[#FFD300]">{goalValue} {displayUnit}</span>
          </div>
          <input type="range" min={sliderMin} max={sliderMax} step={sliderStep}
            value={goalValue} onChange={(e) => setGoalValue(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#FFD300]"
            style={{
              background: `linear-gradient(to right, #FFD300 0%, #FFD300 ${((goalValue - sliderMin) / (sliderMax - sliderMin)) * 100}%, rgba(255,255,255,0.1) ${((goalValue - sliderMin) / (sliderMax - sliderMin)) * 100}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
          <p className="text-[10px] text-slate-500 mt-1">
            {goalMet} von {rawData.length} Einträgen ({goalPct}%) erreichen das Ziel
          </p>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${cardColor}40`, borderTopColor: cardColor }} />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Keine Daten im gewählten Zeitraum</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#1e1e2e', border: `1px solid ${cardColor}30`, borderRadius: '12px', color: '#e2e8f0', fontSize: '13px' }}
              formatter={(v: any, name: any, props: any) => {
                if (name === 'trend') return [`${v} ${displayUnit}`, 'Trend']
                return [
                  <span style={{ color: cardColor }}>{props.payload._real} {displayUnit}</span>,
                  stripEmoji(displayCard?.label ?? ''),
                ]
              }}
            />

            {/* Selected day marker */}
            {selectedDateLabel && (
              <ReferenceLine x={selectedDateLabel} stroke={cardColor} strokeWidth={2} strokeOpacity={0.8} strokeDasharray="4 3"
                label={{ value: '●', position: 'top', fill: cardColor, fontSize: 10 }} />
            )}

            {/* Goal line */}
            {goalActive && (
              <ReferenceLine y={goalDisplayValue} stroke="#FFD300" strokeWidth={1.5} strokeDasharray="6 3" strokeOpacity={0.9}
                label={{ value: `Ziel: ${goalValue} ${displayUnit}`, position: 'insideTopRight', fill: '#FFD300', fontSize: 10 }} />
            )}

            {/* Bars */}
            {(chartType === 'bar' || chartType === 'mixed') && (
              <Bar dataKey="value" fill={cardColor} fillOpacity={chartType === 'mixed' ? 0.3 : 0.75} radius={[3, 3, 0, 0]} maxBarSize={32} />
            )}

            {/* Line with goal-aware dot coloring */}
            {(chartType === 'line' || chartType === 'mixed') && (
              <Line type="monotone" dataKey="value" stroke={cardColor} strokeWidth={2}
                dot={goalActive
                  ? (props: any) => {
                      const { cx, cy, payload } = props
                      const met = weightGoal === 'gain'
                        ? payload._real >= goalValue
                        : payload._real <= goalValue
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={met ? '#ffffff' : cardColor} />
                    }
                  : false
                }
                activeDot={{ r: 5, fill: cardColor }}
              />
            )}

            {/* Trend line */}
            {trendActive && (
              <Line type="monotone" dataKey="trend" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5}
                dot={false} activeDot={false} connectNulls />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
