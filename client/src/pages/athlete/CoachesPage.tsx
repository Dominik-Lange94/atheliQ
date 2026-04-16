import { useMemo, useState } from "react";
import {
  useMyCoaches,
  useSearchCoach,
  useConnectCoach,
  useUpdatePermissions,
  useDisconnectCoach,
} from "../../hooks/useCoach";
import { useCards } from "../../hooks/useStats";

function getDisplayUnit(unit: string): string {
  if (!unit.startsWith("custom||")) return unit;
  const parts = unit.split("||").slice(1);
  const p1 = parts[0]?.split(":") ?? [];
  const p2 = parts[1]?.split(":") ?? [];
  const u1 = p1[1]?.trim() ?? "";
  const u2 = p2[1]?.trim() ?? "";
  if (u1 && u2) return `${u1} / ${u2}`;
  if (u1) return u1;
  const l1 = p1[0]?.trim() ?? "";
  return l1 || "—";
}

function getCleanLabel(label: string): string {
  return label.replace(/^\[[a-z]+\]\s*/, "").replace(/^\p{Emoji}\s*/u, "");
}

function getStatusConfig(status?: "pending" | "active" | "revoked") {
  switch (status) {
    case "pending":
      return {
        label: "Anfrage offen",
        className:
          "border border-[#FFD300]/20 bg-[#FFD300]/10 text-[#c99700] dark:text-[#ffe88a]",
      };
    case "active":
      return {
        label: "Verbunden",
        className:
          "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      };
    case "revoked":
      return {
        label: "Beendet",
        className:
          "border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      };
    default:
      return {
        label: "Unbekannt",
        className: "border border-subtle bg-surface-2 text-secondary",
      };
  }
}

export default function CoachesPage({ onClose }: { onClose: () => void }) {
  const { data: coaches = [], isLoading } = useMyCoaches();
  const { data: cards = [] } = useCards();
  const searchCoach = useSearchCoach();
  const connectCoach = useConnectCoach();
  const updatePermissions = useUpdatePermissions();
  const disconnectCoach = useDisconnectCoach();

  const [email, setEmail] = useState("");
  const [foundCoach, setFoundCoach] = useState<any>(null);
  const [searchError, setSearchError] = useState("");
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(
    null
  );

  const sortedRelations = useMemo(() => {
    return [...coaches].sort((a: any, b: any) => {
      const statusScore = (status?: string) => {
        if (status === "pending") return 0;
        if (status === "active") return 1;
        if (status === "revoked") return 2;
        return 3;
      };

      const aScore = statusScore(a?.status);
      const bScore = statusScore(b?.status);

      if (aScore !== bScore) return aScore - bScore;

      const aTime = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [coaches]);

  const handleSearch = async () => {
    setFoundCoach(null);
    setSearchError("");

    try {
      const result = await searchCoach.mutateAsync(email.trim());
      setFoundCoach(result);
    } catch (err: any) {
      setSearchError(err.response?.data?.error ?? "Fehler bei der Suche");
    }
  };

  const handleConnect = async () => {
    if (!foundCoach) return;

    try {
      await connectCoach.mutateAsync(foundCoach._id);
      setFoundCoach(null);
      setEmail("");
      setSearchError("");
    } catch (err: any) {
      setSearchError(err.response?.data?.error ?? "Anfrage fehlgeschlagen");
    }
  };

  const toggleMetric = async (
    coachId: string,
    cardId: string,
    currentAllowed: string[]
  ) => {
    const updated = currentAllowed.includes(cardId)
      ? currentAllowed.filter((id) => id !== cardId)
      : [...currentAllowed, cardId];

    await updatePermissions.mutateAsync({ coachId, allowedMetrics: updated });
  };

  const handleDisconnect = async (coachId: string) => {
    await disconnectCoach.mutateAsync(coachId);
    setConfirmDisconnect(null);
    setExpandedCoachId(null);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-app">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-subtle bg-surface text-muted transition-all hover:border-strong hover:text-primary"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-semibold text-primary">
              Meine Coaches
            </h1>
            <p className="text-sm text-muted">
              Verwalte Anfragen, Verbindungen und sichtbare Metriken
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-subtle bg-surface p-5">
          <h2 className="mb-4 font-medium text-primary">Coach hinzufügen</h2>

          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFoundCoach(null);
                setSearchError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Email-Adresse des Coaches"
              type="email"
              className="flex-1 rounded-xl border border-subtle bg-surface-2 px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={!email.trim() || searchCoach.isPending}
              className="rounded-xl bg-[#FFD300] px-4 py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
            >
              {searchCoach.isPending ? "…" : "Suchen"}
            </button>
          </div>

          {searchError && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
              {searchError}
            </p>
          )}

          {foundCoach && (
            <div className="mt-3 rounded-xl border border-subtle bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FFD300]/20 bg-[#FFD300]/10 text-sm font-semibold text-[#FFD300]">
                    {foundCoach.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">
                      {foundCoach.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {foundCoach.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={connectCoach.isPending}
                  className="shrink-0 rounded-lg bg-[#FFD300] px-3 py-1.5 text-xs font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
                >
                  {connectCoach.isPending ? "…" : "Anfrage senden"}
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-[#FFD300]/15 bg-[#FFD300]/6 px-3 py-2">
                <p className="text-xs font-medium text-[#c99700] dark:text-[#ffe88a]">
                  Neuer Ablauf
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Der Coach erhält deine Anfrage im Chat und muss sie dort erst
                  akzeptieren. Die Antwort erscheint ebenfalls im Chat.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-subtle bg-surface"
              />
            ))
          ) : sortedRelations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-subtle bg-surface p-10 text-center">
              <p className="mb-2 text-2xl">🏋️</p>
              <p className="text-sm text-secondary">
                Noch kein Coach hinzugefügt
              </p>
              <p className="mt-1 text-xs text-muted">
                Suche oben nach der Email deines Coaches und sende eine Anfrage
              </p>
            </div>
          ) : (
            sortedRelations.map((rel: any) => {
              const coach = rel.coachId;
              const allowed: string[] =
                rel.allowedMetrics?.map((id: any) => id.toString()) ?? [];
              const isExpanded = expandedCoachId === coach._id;
              const isPending = rel.status === "pending";
              const isActive = rel.status === "active";
              const status = getStatusConfig(rel.status);

              return (
                <div
                  key={rel._id}
                  className="overflow-hidden rounded-2xl border border-subtle bg-surface"
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FFD300]/20 bg-[#FFD300]/10 font-semibold text-[#FFD300]">
                      {coach.name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-primary">
                          {coach.name}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-muted">
                        {coach.email}
                      </p>

                      {isPending ? (
                        <p className="mt-1 text-[11px] text-muted">
                          Anfrage gesendet. Antwort kommt im Chat.
                        </p>
                      ) : isActive ? (
                        <p className="mt-1 text-[11px] text-muted">
                          Zugriff auf {allowed.length} von {cards.length}{" "}
                          Metriken
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted">
                          Verbindung wurde beendet
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isActive ? (
                        <>
                          <span className="rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-xs text-secondary">
                            {allowed.length} / {cards.length}
                          </span>
                          <button
                            onClick={() =>
                              setExpandedCoachId(isExpanded ? null : coach._id)
                            }
                            className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-secondary transition-all hover:border-strong hover:text-primary"
                          >
                            {isExpanded ? "Einklappen" : "Berechtigungen"}
                          </button>
                        </>
                      ) : (
                        <div className="rounded-lg border border-subtle bg-surface-2 px-2 py-1 text-[11px] text-muted">
                          {isPending ? "Wartet auf Coach" : "Inaktiv"}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <div className="border-t border-subtle px-4 py-4">
                      <div className="rounded-xl border border-[#FFD300]/15 bg-[#FFD300]/6 px-3 py-3">
                        <p className="text-xs font-medium text-[#c99700] dark:text-[#ffe88a]">
                          Offene Anfrage
                        </p>
                        <p className="mt-1 text-sm text-secondary">
                          Der Coach muss deine Anfrage erst im Chat annehmen,
                          bevor du Metriken freigeben kannst.
                        </p>
                      </div>

                      {confirmDisconnect === coach._id ? (
                        <div className="flex items-center gap-2 pt-4">
                          <p className="flex-1 text-sm text-secondary">
                            Offene Anfrage wirklich zurückziehen?
                          </p>
                          <button
                            onClick={() => handleDisconnect(coach._id)}
                            disabled={disconnectCoach.isPending}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                          >
                            Ja, zurückziehen
                          </button>
                          <button
                            onClick={() => setConfirmDisconnect(null)}
                            className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-secondary transition-all hover:border-strong hover:text-primary"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDisconnect(coach._id)}
                          className="mt-4 text-xs text-red-500/80 transition-colors hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400"
                        >
                          Anfrage zurückziehen
                        </button>
                      )}
                    </div>
                  )}

                  {isActive && isExpanded && (
                    <div className="border-t border-subtle px-4 py-4">
                      <p className="mb-3 text-xs uppercase tracking-wider text-muted">
                        Sichtbare Metriken
                      </p>

                      {cards.length === 0 ? (
                        <p className="text-sm text-muted">
                          Keine Karten vorhanden
                        </p>
                      ) : (
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          {cards.map((card: any) => {
                            const isAllowed = allowed.includes(card._id);

                            return (
                              <button
                                key={card._id}
                                onClick={() =>
                                  toggleMetric(coach._id, card._id, allowed)
                                }
                                disabled={updatePermissions.isPending}
                                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all disabled:opacity-50 ${
                                  isAllowed
                                    ? "border-[#FFD300]/30 bg-[#FFD300]/10"
                                    : "border-subtle bg-surface-2 hover:border-strong hover:bg-surface-3"
                                }`}
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                    isAllowed
                                      ? "border-[#FFD300] bg-[#FFD300]"
                                      : "border-subtle"
                                  }`}
                                >
                                  {isAllowed && (
                                    <svg
                                      className="h-2.5 w-2.5 text-[#0f0f13]"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p
                                    className={`truncate text-xs font-medium ${
                                      isAllowed
                                        ? "text-primary"
                                        : "text-secondary"
                                    }`}
                                  >
                                    {getCleanLabel(card.label)}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {getDisplayUnit(card.unit)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {confirmDisconnect === coach._id ? (
                        <div className="flex items-center gap-2 border-t border-subtle pt-2">
                          <p className="flex-1 text-sm text-secondary">
                            Coach wirklich entfernen?
                          </p>
                          <button
                            onClick={() => handleDisconnect(coach._id)}
                            disabled={disconnectCoach.isPending}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                          >
                            Ja, entfernen
                          </button>
                          <button
                            onClick={() => setConfirmDisconnect(null)}
                            className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-secondary transition-all hover:border-strong hover:text-primary"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDisconnect(coach._id)}
                          className="mt-2 text-xs text-red-500/80 transition-colors hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400"
                        >
                          Coach entfernen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
