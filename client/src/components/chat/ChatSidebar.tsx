import { ChatThread } from "../../types/chat";

interface Props {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelect: (thread: ChatThread) => void;
  isLoading?: boolean;
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getStatusConfig(status?: ChatThread["relationStatus"]) {
  switch (status) {
    case "pending":
      return {
        label: "Offen",
        className:
          "border border-[#FFD300]/20 bg-[#FFD300]/10 text-[#c99700] dark:text-[#ffe88a]",
      };
    case "active":
      return {
        label: "Aktiv",
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
      return null;
  }
}

function getPreviewText(thread: ChatThread) {
  if (thread.lastMessage?.trim()) return thread.lastMessage;

  if (thread.relationStatus === "pending") {
    return "Verbindungsanfrage läuft";
  }

  if (thread.relationStatus === "revoked") {
    return "Chat nicht mehr aktiv";
  }

  return "Noch keine Nachricht";
}

export default function ChatSidebar({
  threads,
  activeThreadId,
  onSelect,
  isLoading,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface lg:w-[320px]">
      <div className="shrink-0 border-b border-subtle px-4 py-4">
        <h2 className="font-semibold text-primary">Chats</h2>
        <p className="mt-1 text-xs text-muted">
          Coach-Athlete Kommunikation & System-Updates
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-subtle bg-surface-2"
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/10">
              <span className="text-lg text-[#FFD300]">💬</span>
            </div>
            <p className="font-medium text-primary">Keine Chats gefunden</p>
            <p className="mt-2 text-sm text-muted">
              Sobald eine Verbindung oder Anfrage existiert, erscheint sie hier.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const active = activeThreadId === thread._id;
            const unreadCount = thread.unreadCount ?? 0;
            const status = getStatusConfig(thread.relationStatus);
            const previewText = getPreviewText(thread);

            return (
              <button
                key={thread._id}
                onClick={() => onSelect(thread)}
                className={`w-full border-b px-4 py-4 text-left transition-all ${
                  active
                    ? "border-[rgba(255,211,0,0.12)] bg-[#FFD300]/10"
                    : "border-subtle hover:bg-surface-2 active:bg-surface-3"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p
                        className={`truncate font-medium ${
                          active ? "text-[#FFD300]" : "text-primary"
                        }`}
                      >
                        {thread.otherUser?.name ?? "Chat"}
                      </p>

                      {status ? (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 truncate text-xs text-secondary">
                      {previewText}
                    </p>

                    {thread.otherUser?.email ? (
                      <p className="mt-1 truncate text-[11px] text-muted">
                        {thread.otherUser.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="text-[11px] text-muted">
                      {formatDate(thread.lastMessageAt)}
                    </div>

                    {unreadCount > 0 ? (
                      <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFD300] px-1.5 text-[11px] font-bold text-[#0f0f13]">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
