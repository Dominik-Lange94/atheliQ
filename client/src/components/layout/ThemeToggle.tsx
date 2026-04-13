import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-lg border border-subtle bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-strong hover:text-primary"
      title="Theme wechseln"
    >
      <span className="text-sm">{resolvedTheme === "dark" ? "☀️" : "🌙"}</span>
      <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
