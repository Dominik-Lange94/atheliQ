import { ChatMessage } from "../../types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function getAttachmentUrl(url: string) {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const apiBase =
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(
      /\/api$/,
      ""
    ) || "http://localhost:5000";

  return `${apiBase}${url}`;
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
        isOwn
          ? "ml-auto border-[#FFD300] bg-[#FFD300] text-[#0f0f13]"
          : "mr-auto border-subtle bg-surface text-primary"
      }`}
    >
      {message.text ? (
        <div
          className={`prose prose-sm max-w-none break-words ${
            isOwn ? "prose-neutral" : "dark:prose-invert"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-relaxed">{children}</li>
              ),
              h1: ({ children }) => (
                <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 mt-3 text-sm font-semibold first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">
                  {children}
                </h3>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={`underline underline-offset-2 ${
                    isOwn
                      ? "text-[#0f0f13]"
                      : "text-[#FFD300] hover:text-[#e6be00]"
                  }`}
                >
                  {children}
                </a>
              ),
              code: ({ children, className, ...props }) => {
                const isBlock = !!className;
                if (isBlock) {
                  return (
                    <code
                      className="block overflow-x-auto rounded-xl bg-black/10 px-3 py-2 text-[13px]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code
                    className="rounded bg-black/10 px-1.5 py-0.5 text-[13px]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-2 border-current/20 pl-3 italic opacity-90">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
      ) : null}

      {!!message.attachments?.length && (
        <div className={`${message.text ? "mt-3" : ""} space-y-2`}>
          {message.attachments.map((attachment, index) => (
            <a
              key={`${attachment.url}-${index}`}
              href={getAttachmentUrl(attachment.url)}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                isOwn
                  ? "border-black/10 bg-white/30 hover:bg-white/40"
                  : "border-subtle bg-surface-2 hover:border-strong hover:bg-surface-3"
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isOwn ? "bg-black/10" : "bg-[#FFD300]/10"
                }`}
              >
                <svg
                  className={`h-4 w-4 ${
                    isOwn ? "text-[#0f0f13]" : "text-[#FFD300]"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.7}
                    d="M12 16V8m0 8l-3-3m3 3l3-3M5 20h14"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {attachment.filename}
                </p>
                <p
                  className={`text-[11px] ${
                    isOwn ? "text-[#0f0f13]/70" : "text-muted"
                  }`}
                >
                  PDF · {(attachment.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      <div
        className={`mt-2 text-[10px] ${
          isOwn ? "text-[#0f0f13]/70" : "text-muted"
        }`}
      >
        {formatTimestamp(message.createdAt)}
      </div>
    </div>
  );
}
