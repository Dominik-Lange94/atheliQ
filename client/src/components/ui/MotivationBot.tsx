import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAiMotivation } from "../../hooks/useAi";
import spaqBotAvatar from "../../assets/spaq-bot-avatar.png";
import { useTheme } from "../../hooks/useTheme";
import SQLoadingScreen from "./SQLoadingScreen";

interface Props {
  hasData?: boolean;
  selectedDate?: string;
}

type MotivationSection = {
  title: string;
  body: string;
};

const GENERIC_LINE_PATTERNS = [
  /^deine motivation:?$/i,
  /^hier ist deine motivation:?$/i,
  /^motivierende einleitung:?$/i,
  /^konkreter datenbezug:?$/i,
  /^nächster fokus:?$/i,
  /^dein fokus:?$/i,
  /^heute wichtig:?$/i,
  /^empfehlung:?$/i,
  /^analyse:?$/i,
  /^motivation:?$/i,
  /^fokus:?$/i,
  /^datenbezug:?$/i,
  /^fortschritt:?$/i,
  /^spaq bot:?$/i,
];

const TITLE_ALIASES: Record<string, string> = {
  motivation: "Motivation",
  "motivierende einleitung": "Motivation",
  "heute wichtig": "Motivation",
  fokus: "Nächster Fokus",
  "dein fokus": "Nächster Fokus",
  "nächster fokus": "Nächster Fokus",
  empfehlung: "Nächster Fokus",
  analyse: "Datenbezug",
  datenbezug: "Datenbezug",
  fortschritt: "Datenbezug",
  "konkreter datenbezug": "Datenbezug",
};

function normalizeWhitespace(input?: string): string {
  if (!input) return "";

  return input
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\*\*/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/["“”„]/g, "")
    .replace(/[•·▪◦]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(line: string): string {
  return line
    .replace(/^\s*[-–—]\s*/, "")
    .replace(/^(skick|sure|klar|okay|ok|gut|super)[,:]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isGenericLine(line: string): boolean {
  const cleaned = cleanLine(line);
  return GENERIC_LINE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function stripGenericIntro(text: string): string {
  return text
    .replace(
      /^(heute geht es um fortschritte!?|hier ist deine motivation:?|deine motivation:?)/i,
      ""
    )
    .replace(/^(wir haben uns gemeinsam ein ziel gesetzt[^.?!]*[.?!]\s*)/i, "")
    .replace(/^(ich bin stolz darauf[^.?!]*[.?!]\s*)/i, "")
    .replace(/^(ich bin stolz auf dich[^.?!]*[.?!]\s*)/i, "")
    .replace(/^(gemeinsam schaffen wir das[^.?!]*[.?!]\s*)/i, "")
    .replace(/^(du hast deine ziele noch nie[^.?!]*[.?!]\s*)/i, "")
    .trim();
}

function cleanupBody(text: string): string {
  const lines = text
    .split("\n")
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !isGenericLine(line));

  return stripGenericIntro(lines.join("\n").trim())
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTitle(raw: string): string {
  const key = raw.trim().toLowerCase();
  return TITLE_ALIASES[key] ?? raw.trim();
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => cleanupBody(part))
    .filter(Boolean);
}

function cleanAiText(input?: string): string {
  const normalized = normalizeWhitespace(input);
  if (!normalized) return "";

  const cleanedLines = normalized
    .split("\n")
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !isGenericLine(line));

  return cleanedLines.join("\n").trim();
}

function pushSection(
  sections: MotivationSection[],
  title: string,
  body: string
) {
  const cleanTitle = normalizeTitle(title);
  const cleanBody = cleanupBody(body);

  if (!cleanBody) return;

  const existing = sections.find((section) => section.title === cleanTitle);

  if (existing) {
    existing.body = `${existing.body}\n\n${cleanBody}`.trim();
    return;
  }

  sections.push({
    title: cleanTitle,
    body: cleanBody,
  });
}

function parseMotivationSections(input?: string): MotivationSection[] {
  const text = cleanAiText(input);
  if (!text) return [];

  const knownTitles = Object.keys(TITLE_ALIASES)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const titleRegex = new RegExp(
    `(?:^|\\n)\\s*(${knownTitles.join("|")})\\s*:?\\s*`,
    "gi"
  );

  const matches = [...text.matchAll(titleRegex)];

  if (matches.length > 0) {
    const sections: MotivationSection[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const rawTitle = match[1].trim();
      const matchStart = match.index ?? 0;
      const titleStartInMatch = match[0]
        .toLowerCase()
        .lastIndexOf(rawTitle.toLowerCase());
      const contentStart =
        matchStart + Math.max(titleStartInMatch, 0) + rawTitle.length;
      const end =
        i + 1 < matches.length
          ? matches[i + 1].index ?? text.length
          : text.length;

      const body = text.slice(contentStart, end).replace(/^:\s*/, "").trim();
      pushSection(sections, rawTitle, body);
    }

    if (sections.length > 0) {
      return sections.filter((section) => section.body.trim().length > 0);
    }
  }

  const paragraphs = splitIntoParagraphs(text);

  if (paragraphs.length >= 3) {
    const sections: MotivationSection[] = [];
    pushSection(sections, "Motivation", paragraphs[0]);
    pushSection(sections, "Datenbezug", paragraphs[1]);
    pushSection(sections, "Nächster Fokus", paragraphs.slice(2).join("\n\n"));
    return sections;
  }

  if (paragraphs.length === 2) {
    const sections: MotivationSection[] = [];
    pushSection(sections, "Motivation", paragraphs[0]);
    pushSection(sections, "Nächster Fokus", paragraphs[1]);
    return sections;
  }

  const fallback = cleanupBody(text);
  if (!fallback) return [];

  return [
    {
      title: "Motivation",
      body: fallback,
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
  const navigate = useNavigate();
  const { data, isLoading, refetch, isFetching } =
    useAiMotivation(selectedDate);

  const sections = useMemo(() => {
    const structured = (data as any)?.structured;

    if (structured) {
      return [
        structured.motivation
          ? { title: "Motivation", body: structured.motivation }
          : null,
        structured.dataPoint
          ? { title: "Datenbezug", body: structured.dataPoint }
          : null,
        structured.nextFocus
          ? { title: "Nächster Fokus", body: structured.nextFocus }
          : null,
      ].filter(Boolean) as MotivationSection[];
    }

    return parseMotivationSections(data?.text);
  }, [data]);

  const { resolvedTheme } = useTheme();
  const loaderMode = resolvedTheme === "light" ? "light" : "dark";

  if (!visible) return null;

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-subtle bg-surface">
      <div className="border-b border-subtle px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/10 shadow-[0_0_20px_rgba(255,211,0,0.08)]">
                <img
                  src={spaqBotAvatar}
                  alt="SPAQ Bot"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-semibold tracking-tight text-primary">
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
              onClick={() => navigate("/chat")}
              className="rounded-xl border border-subtle bg-surface px-3 py-1.5 text-xs text-secondary transition hover:border-strong hover:text-primary"
            >
              Chat
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
            <div className="flex flex-col items-center justify-center">
              <SQLoadingScreen compact mode={loaderMode} className="px-0" />
              <p className="mt-2 text-center text-sm leading-6 text-muted">
                SPAQ erstellt gerade deine Motivation…
              </p>
            </div>
          </div>
        ) : !data?.text || sections.length === 0 ? (
          <div className="rounded-2xl border border-subtle bg-surface-2 p-4">
            <p className="text-sm leading-6 text-muted">
              Ich konnte gerade keine saubere Motivation generieren. Prüfe
              bitte, ob Ollama läuft.
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
