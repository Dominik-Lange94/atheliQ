import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../lib/api";

type Props = {
  onClose: () => void;
};

export default function MobileConnectModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.post("/auth/mobile-link-token");
        const payload = res.data?.data?.qrPayload;
        const expiry = res.data?.data?.expiresAt;

        if (!payload?.token) {
          throw new Error("QR-Token konnte nicht erstellt werden.");
        }

        setQrValue(JSON.stringify(payload));
        setExpiresAt(expiry ?? "");
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            "QR konnte nicht geladen werden."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-subtle bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              Mobile App verbinden
            </h2>
            <p className="mt-1 text-sm text-muted">
              QR mit der SPAQ Health App scannen
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-xl leading-none text-muted transition-colors hover:text-primary"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-subtle bg-surface-2 text-muted">
            Lade QR…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={qrValue} size={220} />
            </div>

            <div className="mt-4 rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/5 px-4 py-3">
              <p className="text-sm font-medium text-[#c99700] dark:text-[#FFD300]">
                1. App öffnen
              </p>
              <p className="mt-1 text-sm text-secondary">
                Im Login-Screen auf „QR-Code scannen“ tippen und diesen Code
                scannen.
              </p>
            </div>

            {expiresAt ? (
              <p className="mt-3 text-center text-xs text-muted">
                Gültig bis{" "}
                {new Date(expiresAt).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
