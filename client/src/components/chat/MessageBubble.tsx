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

function SystemMessageCard({
  icon,
  title,
  text,
  timestamp,
  wrapperClassName,
  iconWrapperClassName,
  iconClassName,
  titleClassName,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  timestamp?: string;
  wrapperClassName: string;
  iconWrapperClassName: string;
  iconClassName: string;
  titleClassName: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex justify-center">
      <div
        className={`w-full max-w-[92%] rounded-2xl border px-4 py-4 ${wrapperClassName}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconWrapperClassName}`}
          >
            <div className={iconClassName}>{icon}</div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-semibold ${titleClassName}`}>
                {title}
              </p>
              {badge}
            </div>

            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-secondary">
              {text}
            </p>

            <div className="mt-2 text-[10px] text-muted">{timestamp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessageBubble({ message, isOwn }: Props) {
  const type = message.meta?.type ?? "user";
  const isSystemMessage = type !== "user";

  if (type === "connect_request") {
    return (
      <SystemMessageCard
        icon={
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              d="M18 9v6m3-3h-6m-6 5a4 4 0 100-8 4 4 0 000 8zm0 0v1m0-13a4 4 0 110 8 4 4 0 010-8z"
            />
          </svg>
        }
        title="Verbindungsanfrage"
        text={message.text}
        timestamp={formatTimestamp(message.createdAt)}
        wrapperClassName="border-[#FFD300]/20 bg-[#FFD300]/8"
        iconWrapperClassName="border-[#FFD300]/20 bg-[#FFD300]/12"
        iconClassName="text-[#FFD300]"
        titleClassName="text-[#c99700] dark:text-[#ffe88a]"
        badge={
          message.meta?.actionRequired ? (
            <span className="rounded-full border border-subtle bg-surface px-2 py-1 text-[10px] font-medium text-secondary">
              Aktion erforderlich
            </span>
          ) : undefined
        }
      />
    );
  }

  if (type === "connect_accepted") {
    return (
      <SystemMessageCard
        icon={
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M5 13l4 4L19 7"
            />
          </svg>
        }
        title="Anfrage akzeptiert"
        text={message.text}
        timestamp={formatTimestamp(message.createdAt)}
        wrapperClassName="border-emerald-500/20 bg-emerald-500/10"
        iconWrapperClassName="border-emerald-500/20 bg-emerald-500/12"
        iconClassName="text-emerald-600 dark:text-emerald-300"
        titleClassName="text-emerald-600 dark:text-emerald-300"
      />
    );
  }

  if (type === "connect_declined") {
    return (
      <SystemMessageCard
        icon={
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        }
        title="Anfrage abgelehnt"
        text={message.text}
        timestamp={formatTimestamp(message.createdAt)}
        wrapperClassName="border-rose-500/20 bg-rose-500/10"
        iconWrapperClassName="border-rose-500/20 bg-rose-500/12"
        iconClassName="text-rose-600 dark:text-rose-300"
        titleClassName="text-rose-600 dark:text-rose-300"
      />
    );
  }

  if (type === "permission_update") {
    return (
      <SystemMessageCard
        icon={
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2"
            />
          </svg>
        }
        title="Freigaben aktualisiert"
        text={message.text}
        timestamp={formatTimestamp(message.createdAt)}
        wrapperClassName="border-blue-500/20 bg-blue-500/10"
        iconWrapperClassName="border-blue-500/20 bg-blue-500/12"
        iconClassName="text-blue-600 dark:text-blue-300"
        titleClassName="text-blue-600 dark:text-blue-300"
      />
    );
  }

  return (
    <div
      className={`max-w-[78%] rounded-2xl border px-4 py-3 ${
        isSystemMessage
          ? "mx-auto border-subtle bg-surface text-primary"
          : isOwn
          ? "ml-auto border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
          : "mr-auto border-subtle bg-surface text-primary"
      }`}
    >
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {message.text}
      </p>

      <div
        className={`mt-2 text-[10px] ${
          isSystemMessage
            ? "text-muted"
            : isOwn
            ? "text-[#0f0f13]/70"
            : "text-muted"
        }`}
      >
        {formatTimestamp(message.createdAt)}
      </div>
    </div>
  );
}
