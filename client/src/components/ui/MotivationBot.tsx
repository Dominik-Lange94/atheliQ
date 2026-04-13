import { useMemo, useState } from "react";
import { useAiMotivation } from "../../hooks/useAi";

interface Props {
  hasData?: boolean;
  selectedDate?: string;
}

type MotivationSection = {
  title: string;
  body: string;
};

function cleanAiText(input?: string): string {
  if (!input) return "";

  return input
    .replace(/\r\n/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/["“”]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseMotivationSections(input?: string): MotivationSection[] {
  const text = cleanAiText(input);
  if (!text) return [];

  const knownTitles = [
    "Motivierende Einleitung",
    "Konkreter Datenbezug",
    "Nächster Fokus",
    "Dein Fokus",
    "Heute wichtig",
    "Empfehlung",
    "Analyse",
  ];

  const escapedTitles = knownTitles.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  const titleRegex = new RegExp(`(${escapedTitles.join("|")})\\s*:?\\s*`, "g");
  const matches = [...text.matchAll(titleRegex)];

  if (matches.length === 0) {
    return [
      {
        title: "Deine Motivation",
        body: text,
      },
    ];
  }

  const sections: MotivationSection[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1].trim();
    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const body = text.slice(start, end).trim();

    if (body) sections.push({ title, body });
  }

  return sections.length
    ? sections
    : [
        {
          title: "Deine Motivation",
          body: text,
        },
      ];
}

function titleToAccent(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("daten") || normalized.includes("analyse")) {
    return "text-cyan-400 dark:text-cyan-300";
  }

  if (normalized.includes("fokus") || normalized.includes("empfehlung")) {
    return "text-emerald-500 dark:text-emerald-300";
  }

  return "text-accent";
}

export default function MotivationBot({ hasData, selectedDate }: Props) {
  const [visible, setVisible] = useState(true);
  const { data, isLoading, refetch, isFetching } =
    useAiMotivation(selectedDate);

  const sections = useMemo(
    () => parseMotivationSections(data?.text),
    [data?.text]
  );

  if (!visible) return null;

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-subtle bg-surface shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="border-b border-subtle px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/12 text-[#FFD300] shadow-[0_0_20px_rgba(255,211,0,0.08)]">
                ✦
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-primary font-semibold tracking-tight">
                  SPAQ Bot
                </h3>
                <p className="text-xs text-muted">
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
              className="rounded-xl border border-subtle bg-surface px-3 py-1.5 text-xs text-secondary transition hover:border-strong hover:text-primary disabled:opacity-50"
            >
              {isFetching ? "Lädt…" : "Neu"}
            </button>
            <button
              onClick={() => setVisible(false)}
              className="text-sm text-muted transition hover:text-primary"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {!hasData ? (
          <div className="rounded-2xl border border-subtle bg-surface-2 p-4">
            <p className="text-sm leading-6 text-secondary">
              Sobald du erste Werte einträgst, analysiere ich deine Entwicklung
              und gebe dir passende Motivation und Hinweise.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-2xl border border-subtle bg-surface-2 p-4">
            <p className="text-sm leading-6 text-muted">
              SPAQ analysiert gerade deine Daten…
            </p>
          </div>
        ) : !data?.text ? (
          <div className="rounded-2xl border border-subtle bg-surface-2 p-4">
            <p className="text-sm leading-6 text-muted">
              Ich konnte gerade keine Motivation generieren. Prüfe bitte, ob
              Ollama läuft.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={`${section.title}-${index}`}
                className="rounded-2xl border border-subtle bg-surface-2 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${titleToAccent(
                      section.title
                    )}`}
                  >
                    {section.title}
                  </span>
                </div>

                <p className="text-sm leading-7 text-secondary">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-[#FFD300]/20 bg-[#FFD300]/10 px-3 py-1.5 text-xs font-medium text-[#FFD300] transition hover:bg-[#FFD300]/15 disabled:opacity-50"
          >
            Motivation aktualisieren
          </button>
        </div>
      </div>
    </div>
  );
}
