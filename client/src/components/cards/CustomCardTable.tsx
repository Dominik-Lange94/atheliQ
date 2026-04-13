import { useState } from "react";
import {
  useCardEntries,
  useLogEntry,
  useDeleteEntry,
} from "../../hooks/useStats";

interface Props {
  card: { _id: string; label: string; unit: string; type: string };
  onClose: () => void;
}

function parseUnit(unit: string) {
  if (!unit.startsWith("custom||")) {
    if (unit === "min/km") {
      return {
        param1: { label: "Distanz", unit: "km" },
        param2: { label: "Zeit", unit: "min" },
      };
    }
    if (unit === "km/h") {
      return {
        param1: { label: "Distanz", unit: "km" },
        param2: { label: "Zeit", unit: "min" },
      };
    }
    return { param1: { label: "Wert", unit }, param2: null };
  }

  const parts = unit.split("||").slice(1);
  const p1 = parts[0]?.split(":") ?? [];
  const p2 = parts[1]?.split(":") ?? [];

  return {
    param1: { label: p1[0]?.trim() ?? "Wert", unit: p1[1]?.trim() ?? "" },
    param2:
      p2.length === 2 ? { label: p2[0]?.trim(), unit: p2[1]?.trim() } : null,
  };
}

function getDisplayUnit(unit: string): string {
  if (!unit.startsWith("custom||")) return unit;

  const parts = unit.split("||").slice(1);
  const p1 = parts[0]?.split(":") ?? [];
  const p2 = parts[1]?.split(":") ?? [];
  const u1 = p1[1]?.trim() ?? "";
  const u2 = p2[1]?.trim() ?? "";

  if (u1 && u2) return `${u1} / ${u2}`;
  if (u1) return u1;
  return p1[0]?.trim() || "—";
}

function getCleanLabel(label: string): string {
  return label.replace(/^\p{Emoji}\s*/u, "");
}

export default function CustomCardTable({ card, onClose }: Props) {
  const { data: entries = [], isLoading } = useCardEntries(card._id);
  const logEntry = useLogEntry();
  const deleteEntry = useDeleteEntry();

  const { param1, param2 } = parseUnit(card.unit);
  const isPace = card.unit === "min/km";
  const isSpeed = card.unit === "km/h";

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const pace =
    isPace && val1 && val2
      ? (parseFloat(val2) / parseFloat(val1)).toFixed(2)
      : null;

  const speed =
    isSpeed && val1 && val2
      ? (parseFloat(val1) / (parseFloat(val2) / 60)).toFixed(1)
      : null;

  const handleAdd = () => {
    if (!val1) return;

    logEntry.mutate(
      {
        cardId: card._id,
        value: parseFloat(val1),
        secondaryValue: val2 ? parseFloat(val2) : undefined,
        note: note || undefined,
        recordedAt: new Date(date).toISOString(),
      },
      {
        onSuccess: () => {
          setVal1("");
          setVal2("");
          setNote("");
        },
      }
    );
  };

  const handleDelete = (entryId: string) => {
    deleteEntry.mutate(
      { entryId, cardId: card._id },
      {
        onSuccess: () => setConfirmDelete(null),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-subtle bg-surface p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {getCleanLabel(card.label)}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {getDisplayUnit(card.unit)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-xl text-muted transition-colors hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-subtle bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-secondary">
            Neuer Eintrag
          </p>

          <div
            className={`grid gap-3 ${
              param2
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            <div>
              <label className="mb-1 block text-xs text-muted">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted">
                {param1.label}
                {param1.unit && (
                  <span className="ml-1 text-muted">({param1.unit})</span>
                )}
                <span className="ml-1 text-[#FFD300]">*</span>
              </label>
              <input
                type="number"
                value={val1}
                onChange={(e) => setVal1(e.target.value)}
                placeholder="0"
                step="any"
                min="0"
                className="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
              />
            </div>

            {param2 && (
              <div>
                <label className="mb-1 block text-xs text-muted">
                  {param2.label}
                  {param2.unit && (
                    <span className="ml-1 text-muted">({param2.unit})</span>
                  )}
                  <span className="ml-1 text-xs text-muted">optional</span>
                </label>
                <input
                  type="number"
                  value={val2}
                  onChange={(e) => setVal2(e.target.value)}
                  placeholder="0"
                  step="any"
                  min="0"
                  className="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-muted">Notiz</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
              />
            </div>
          </div>

          {pace && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">Pace:</span>
              <span className="text-sm font-semibold text-[#FFD300]">
                {pace} min/km
              </span>
            </div>
          )}

          {speed && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">Ø Speed:</span>
              <span className="text-sm font-semibold text-[#FFD300]">
                {speed} km/h
              </span>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={logEntry.isPending || !val1}
            className="mt-3 rounded-lg bg-[#FFD300] px-5 py-2 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
          >
            {logEntry.isPending ? "Speichern…" : "+ Hinzufügen"}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg border border-subtle bg-surface-2"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            Noch keine Einträge.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle">
                  <th className="pb-2 pr-4 text-left text-xs font-medium text-muted">
                    Datum
                  </th>
                  <th className="pb-2 pr-4 text-right text-xs font-medium text-muted">
                    {param1.label}
                    {param1.unit ? ` (${param1.unit})` : ""}
                  </th>

                  {param2 && (
                    <th className="pb-2 pr-4 text-right text-xs font-medium text-muted">
                      {param2.label}
                      {param2.unit ? ` (${param2.unit})` : ""}
                    </th>
                  )}

                  {(isPace || isSpeed) && (
                    <th className="pb-2 pr-4 text-right text-xs font-medium text-muted">
                      {isPace ? "Pace" : "Ø Speed"}
                    </th>
                  )}

                  <th className="pb-2 text-left text-xs font-medium text-muted">
                    Notiz
                  </th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[...entries].reverse().map((entry: any) => {
                  const calcPace =
                    isPace && entry.secondaryValue && entry.value
                      ? (entry.secondaryValue / entry.value).toFixed(2)
                      : null;

                  const calcSpeed =
                    isSpeed && entry.secondaryValue && entry.value
                      ? (entry.value / (entry.secondaryValue / 60)).toFixed(1)
                      : null;

                  return (
                    <tr
                      key={entry._id}
                      className="group transition-colors hover:bg-surface-2"
                    >
                      <td className="py-2.5 pr-4 text-secondary">
                        {new Date(entry.recordedAt).toLocaleDateString(
                          "de-DE",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          }
                        )}
                      </td>

                      <td className="py-2.5 pr-4 text-right font-medium text-primary">
                        {entry.value} {param1.unit}
                      </td>

                      {param2 && (
                        <td className="py-2.5 pr-4 text-right text-secondary">
                          {entry.secondaryValue
                            ? `${entry.secondaryValue} ${param2.unit}`
                            : "—"}
                        </td>
                      )}

                      {isPace && (
                        <td className="py-2.5 pr-4 text-right">
                          {calcPace ? (
                            <span className="font-medium text-[#FFD300]">
                              {calcPace} min/km
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}

                      {isSpeed && (
                        <td className="py-2.5 pr-4 text-right">
                          {calcSpeed ? (
                            <span className="font-medium text-[#FFD300]">
                              {calcSpeed} km/h
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}

                      <td className="py-2.5 text-xs text-muted">
                        {entry.note || ""}
                      </td>

                      <td className="py-2.5 text-right">
                        {confirmDelete === entry._id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDelete(entry._id)}
                              disabled={deleteEntry.isPending}
                              className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-500 transition-all hover:border-red-500/50 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            >
                              Ja
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded border border-subtle px-2 py-0.5 text-xs text-secondary transition-all hover:border-strong hover:text-primary"
                            >
                              Nein
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(entry._id)}
                            className="text-base leading-none text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400"
                            title="Eintrag löschen"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
