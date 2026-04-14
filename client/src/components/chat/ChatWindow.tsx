import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage, ChatThread } from "../../types/chat";
import MessageBubble from "./MessageBubble";
import ChatAvatar from "./ChatAvatar";

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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit(e as unknown as FormEvent);
    }
  };

  if (!thread) {
    return (
      <section className="flex min-h-[600px] flex-1 items-center justify-center rounded-2xl border border-subtle bg-surface">
        <div className="px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/10">
            <span className="text-xl text-[#FFD300]">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-primary">
            Wähle einen Chat
          </h3>
          <p className="mt-2 text-sm text-muted">
            Öffne einen Coach-Athlete-Thread, um Nachrichten und System-Updates
            zu sehen.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-subtle bg-surface">
      <div className="flex items-center gap-3 border-b border-subtle px-5 py-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-subtle bg-surface-2 text-secondary transition-all hover:border-strong hover:bg-surface-3 hover:text-primary lg:hidden"
            title="Zurück"
          >
            <svg
              className="h-4 w-4"
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

        <ChatAvatar
          name={thread.otherUser?.name}
          avatarUrl={thread.otherUser?.avatarUrl}
          sizeClassName="h-11 w-11"
          textClassName="text-sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-primary">
              {thread.otherUser?.name ?? "Chat"}
            </p>

            {statusConfig ? (
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            ) : null}
          </div>

          <p className="mt-1 truncate text-xs text-muted">
            {thread.otherUser?.email ?? ""}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-2 px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-16 rounded-2xl animate-pulse ${
                  i % 2 === 0
                    ? "mr-20 border border-subtle bg-surface"
                    : "ml-20 bg-[#FFD300]/10"
                }`}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <p className="font-medium text-primary">Noch keine Nachrichten</p>
              <p className="mt-2 text-sm text-muted">
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
        className="flex items-end gap-3 border-t border-subtle p-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={composerPlaceholder}
          disabled={disableComposer || isSending}
          className={`flex-1 resize-none rounded-2xl px-4 py-3 text-primary placeholder:text-muted focus:outline-none transition-all ${
            disableComposer
              ? "cursor-not-allowed border border-subtle bg-surface-2 opacity-70"
              : "border border-subtle bg-surface-2 focus:border-[#FFD300]/50"
          }`}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-2xl bg-[#FFD300] px-5 py-3 font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-50 disabled:hover:bg-[#FFD300]"
        >
          {isSending ? "…" : "Senden"}
        </button>
      </form>
    </section>
  );
}
