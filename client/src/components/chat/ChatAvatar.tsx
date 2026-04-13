interface Props {
  name?: string;
  avatarUrl?: string;
  sizeClassName?: string;
  textClassName?: string;
  roundedClassName?: string;
}

function getInitials(name?: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function ChatAvatar({
  name,
  avatarUrl,
  sizeClassName = "h-11 w-11",
  textClassName = "text-sm",
  roundedClassName = "rounded-2xl",
}: Props) {
  const initials = getInitials(name);

  return (
    <div
      className={`shrink-0 overflow-hidden border border-subtle bg-surface-2 ${sizeClassName} ${roundedClassName}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? "Avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-semibold text-secondary ${textClassName}`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
