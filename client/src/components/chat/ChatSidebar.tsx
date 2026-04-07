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
        className: "bg-[#FFD300]/10 text-[#ffe88a] border border-[#FFD300]/20",
      };
    case "active":
      return {
        label: "Aktiv",
        className:
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
      };
    case "revoked":
      return {
        label: "Beendet",
        className: "bg-rose-500/10 text-rose-300 border border-rose-500/20",
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
    <aside className="w-full lg:w-[320px] border border-white/10 rounded-2xl bg-[#15151c] overflow-hidden h-full min-h-0 flex flex-col">
      <div className="px-4 py-4 border-b border-white/10 shrink-0">
        <h2 className="text-white font-semibold">Chats</h2>
        <p className="text-slate-400 text-xs mt-1">
          Coach-Athlete Kommunikation & System-Updates
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-[#FFD300] text-lg">💬</span>
            </div>
            <p className="text-white font-medium">Keine Chats gefunden</p>
            <p className="text-sm text-slate-400 mt-2">
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
                className={`w-full text-left px-4 py-4 border-b border-white/5 transition-all ${
                  active
                    ? "bg-[#FFD300]/10"
                    : "hover:bg-white/[0.03] active:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <p
                        className={`font-medium truncate ${
                          active ? "text-[#FFD300]" : "text-white"
                        }`}
                      >
                        {thread.otherUser?.name ?? "Chat"}
                      </p>

                      {status ? (
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-400 truncate mt-1">
                      {previewText}
                    </p>

                    {thread.otherUser?.email ? (
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {thread.otherUser.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="text-[11px] text-slate-500">
                      {formatDate(thread.lastMessageAt)}
                    </div>

                    {unreadCount > 0 ? (
                      <div className="min-w-5 h-5 px-1.5 rounded-full bg-[#FFD300] text-[#0f0f13] text-[11px] font-bold flex items-center justify-center">
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
