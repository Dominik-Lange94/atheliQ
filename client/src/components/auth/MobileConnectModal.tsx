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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#15151c] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white text-lg font-semibold">
              Mobile App verbinden
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              QR mit der AthletiQ Health App scannen
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="h-72 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400">
            Lade QR…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white p-4 flex items-center justify-center">
              <QRCodeSVG value={qrValue} size={220} />
            </div>

            <div className="mt-4 rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/5 px-4 py-3">
              <p className="text-[#FFD300] text-sm font-medium">
                1. App öffnen
              </p>
              <p className="text-slate-300 text-sm mt-1">
                Im Login-Screen auf „QR-Code scannen“ tippen und diesen Code
                scannen.
              </p>
            </div>

            {expiresAt ? (
              <p className="text-xs text-slate-500 mt-3 text-center">
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
