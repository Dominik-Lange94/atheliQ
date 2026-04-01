import { useState, useEffect } from 'react'

const QUOTES = [
  "Jeder Tag ist ein neuer Start. Du schaffst das! 💪",
  "Kleine Fortschritte zählen auch — hauptsache du bewegst dich.",
  "Dein zukünftiges Ich wird dir danken.",
  "Konsistenz schlägt Perfektion. Bleib dran!",
  "Du bist stärker als du denkst.",
  "Kein Training ist verschwendete Zeit.",
  "Fortschritt, nicht Perfektion — das ist das Ziel.",
  "Der schwerste Schritt ist der erste. Den hast du schon gemacht.",
  "Heute der schlechtere Teil von dir, morgen der bessere.",
  "Deine Daten lügen nicht — du wächst.",
]

interface Props {
  hasData?: boolean
  selectedDate?: string
}

export default function MotivationBot({ hasData, selectedDate }: Props) {
  const [quote, setQuote] = useState('')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Pick a quote based on date so it's consistent per day
    const seed = selectedDate
      ? new Date(selectedDate).getDate() + new Date(selectedDate).getMonth()
      : new Date().getDate()
    setQuote(QUOTES[seed % QUOTES.length])
  }, [selectedDate])

  if (!visible) return null

  return (
    <div className="relative flex items-start gap-4 bg-white/3 border border-white/10 rounded-2xl p-4">
      {/* Dismiss */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 text-slate-600 hover:text-slate-400 transition-colors text-sm leading-none"
        title="Ausblenden"
      >✕</button>

      {/* Robot face */}
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center text-2xl select-none">
        🤖
      </div>

      {/* Speech bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[#FFD300] text-xs font-medium">AthletiQ Bot</p>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-slate-500 text-xs">Motivationscoach</span>
          {!hasData && (
            <span className="ml-auto text-[10px] text-slate-600 border border-white/10 rounded-full px-2 py-0.5">
              KI-Analyse folgt
            </span>
          )}
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">{quote}</p>
        {!hasData && (
          <p className="text-slate-600 text-xs mt-1.5">
            Sobald du Daten trackst, analysiere ich deinen Fortschritt für dich.
          </p>
        )}
      </div>
    </div>
  )
}
