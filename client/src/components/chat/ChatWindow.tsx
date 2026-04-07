import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage, ChatThread } from "../../types/chat";
import MessageBubble from "./MessageBubble";

interface Props {
  thread: ChatThread | null;
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (text: string) => Promise<void>;
  isLoading?: boolean;
  isSending?: boolean;
  onBack?: () => void | Promise<void>;
  disableComposer?: boolean;
  composerPlaceholder?: string;
}

export default function ChatWindow({
  thread,
  messages,
  currentUserId,
  onSend,
  isLoading,
  isSending,
  onBack,
  disableComposer = false,
  composerPlaceholder = "Nachricht schreiben...",
}: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setText("");
  }, [thread?._id]);

  const statusConfig = useMemo(() => {
    switch (thread?.relationStatus) {
      case "pending":
        return {
          label: "Anfrage offen",
          className:
            "bg-[#FFD300]/10 text-[#ffe88a] border border-[#FFD300]/20",
        };
      case "active":
        return {
          label: "Verbunden",
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
  }, [thread?.relationStatus]);

  const canSubmit = !disableComposer && !isSending && !!text.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = text.trim();
    if (!trimmed || isSending || disableComposer) return;

    await onSend(trimmed);
    setText("");
  };

  if (!thread) {
    return (
      <section className="flex-1 border border-white/10 rounded-2xl bg-[#15151c] flex items-center justify-center min-h-[600px]">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-[#FFD300] text-xl">💬</span>
          </div>
          <h3 className="text-white text-lg font-semibold">Wähle einen Chat</h3>
          <p className="text-slate-400 text-sm mt-2">
            Öffne einen Coach-Athlete-Thread, um Nachrichten und System-Updates
            zu sehen.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full min-h-0 flex-1 border border-white/10 rounded-2xl bg-[#15151c] overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            title="Zurück"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold truncate">
              {thread.otherUser?.name ?? "Chat"}
            </p>

            {statusConfig ? (
              <span
                className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            ) : null}
          </div>

          <p className="text-xs text-slate-400 mt-1 truncate">
            {thread.otherUser?.email ?? ""}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-[#111118]">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-16 rounded-2xl animate-pulse ${
                  i % 2 === 0 ? "bg-white/5 mr-20" : "bg-[#FFD300]/10 ml-20"
                }`}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <p className="text-white font-medium">Noch keine Nachrichten</p>
              <p className="text-slate-400 text-sm mt-2">
                {thread.relationStatus === "pending"
                  ? "Die Verbindungsanfrage läuft. Updates erscheinen direkt hier im Chat."
                  : thread.relationStatus === "revoked"
                  ? "Dieser Chat ist nicht mehr aktiv."
                  : "Starte die erste Unterhaltung in diesem Thread."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={message.senderId === currentUserId}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 p-4 flex items-end gap-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={composerPlaceholder}
          disabled={disableComposer || isSending}
          className={`flex-1 resize-none rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-all ${
            disableComposer
              ? "bg-white/[0.03] border border-white/5 cursor-not-allowed opacity-70"
              : "bg-white/5 border border-white/10 focus:border-[#FFD300]/50"
          }`}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="px-5 py-3 rounded-2xl bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-50 disabled:hover:bg-[#FFD300] text-[#0f0f13] font-medium transition-colors"
        >
          {isSending ? "…" : "Senden"}
        </button>
      </form>
    </section>
  );
}
