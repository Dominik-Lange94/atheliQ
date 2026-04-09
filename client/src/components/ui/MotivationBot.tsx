import { useState } from "react";
import { useAiMotivation } from "../../hooks/useAi";

interface Props {
  hasData?: boolean;
  selectedDate?: string;
}

export default function MotivationBot({ hasData, selectedDate }: Props) {
  const [visible, setVisible] = useState(true);
  const { data, isLoading, refetch, isFetching } =
    useAiMotivation(selectedDate);

  if (!visible) return null;

  return (
    <div className="mt-5 rounded-3xl border border-[#FFD300]/15 bg-gradient-to-br from-[#17171d] to-[#101015] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-[#FFD300]/12 border border-[#FFD300]/20 flex items-center justify-center text-[#FFD300]">
              ✦
            </div>
            <div>
              <h3 className="text-white font-semibold">AthletiQ Bot</h3>
              <p className="text-xs text-slate-400">
                {data
                  ? `${data.provider === "ollama" ? "Lokal" : "Cloud"} · ${
                      data.model
                    }`
                  : "Intelligente Motivation"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition"
          >
            {isFetching ? "Lädt…" : "Neu"}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="text-slate-500 hover:text-slate-300 text-sm"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
        {!hasData ? (
          <p className="text-sm leading-6 text-slate-300">
            Sobald du erste Werte einträgst, analysiere ich deine Entwicklung
            und gebe dir passende Motivation und Hinweise.
          </p>
        ) : isLoading ? (
          <p className="text-sm leading-6 text-slate-400">
            AthletiQ analysiert gerade deine Daten…
          </p>
        ) : (
          <p className="text-sm leading-6 text-slate-200">
            {data?.text ||
              "Ich konnte gerade keine Motivation generieren. Prüfe bitte, ob Ollama läuft."}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#FFD300]/10 text-[#FFD300] border border-[#FFD300]/20 hover:bg-[#FFD300]/15 transition"
        >
          Motivation aktualisieren
        </button>
      </div>
    </div>
  );
}
