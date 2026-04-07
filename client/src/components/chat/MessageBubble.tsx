import { ChatMessage } from "../../types/chat";

interface Props {
  message: ChatMessage;
  isOwn: boolean;
}

function formatTimestamp(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message, isOwn }: Props) {
  const type = message.meta?.type ?? "user";
  const isSystemMessage = type !== "user";

  if (type === "connect_request") {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[92%] rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/8 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFD300]/12 border border-[#FFD300]/20 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-[#FFD300]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M18 9v6m3-3h-6m-6 5a4 4 0 100-8 4 4 0 000 8zm0 0v1m0-13a4 4 0 110 8 4 4 0 010-8z"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#ffe88a]">
                  Verbindungsanfrage
                </p>
                {message.meta?.actionRequired ? (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white/8 border border-white/10 text-slate-300">
                    Aktion erforderlich
                  </span>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-slate-200 mt-1 whitespace-pre-wrap break-words">
                {message.text}
              </p>

              <div className="mt-2 text-[10px] text-slate-400">
                {formatTimestamp(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "connect_accepted") {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[92%] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-emerald-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-300">
                Anfrage akzeptiert
              </p>
              <p className="text-sm leading-relaxed text-slate-200 mt-1 whitespace-pre-wrap break-words">
                {message.text}
              </p>
              <div className="mt-2 text-[10px] text-slate-400">
                {formatTimestamp(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "connect_declined") {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[92%] rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/12 border border-rose-500/20 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-rose-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-300">
                Anfrage abgelehnt
              </p>
              <p className="text-sm leading-relaxed text-slate-200 mt-1 whitespace-pre-wrap break-words">
                {message.text}
              </p>
              <div className="mt-2 text-[10px] text-slate-400">
                {formatTimestamp(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "permission_update") {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[92%] rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/12 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-300">
                Freigaben aktualisiert
              </p>
              <p className="text-sm leading-relaxed text-slate-200 mt-1 whitespace-pre-wrap break-words">
                {message.text}
              </p>
              <div className="mt-2 text-[10px] text-slate-400">
                {formatTimestamp(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`max-w-[78%] rounded-2xl px-4 py-3 border ${
        isSystemMessage
          ? "mx-auto bg-white/6 text-white border-white/10"
          : isOwn
          ? "ml-auto bg-[#FFD300] text-[#0f0f13] border-[#FFD300]"
          : "mr-auto bg-white/5 text-white border-white/10"
      }`}
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.text}
      </p>

      <div
        className={`mt-2 text-[10px] ${
          isSystemMessage
            ? "text-slate-500"
            : isOwn
            ? "text-[#0f0f13]/70"
            : "text-slate-500"
        }`}
      >
        {formatTimestamp(message.createdAt)}
      </div>
    </div>
  );
}
