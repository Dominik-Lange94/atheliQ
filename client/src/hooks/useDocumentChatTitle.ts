import { useEffect, useRef } from "react";

type Options = {
  senderName?: string | null;
  enabled: boolean;
  baseTitle?: string;
};

export function useDocumentChatTitle({
  senderName,
  enabled,
  baseTitle = "AthletiQ",
}: Options) {
  const intervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>(baseTitle);

  useEffect(() => {
    originalTitleRef.current = baseTitle;
  }, [baseTitle]);

  useEffect(() => {
    const resetTitle = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.title = originalTitleRef.current;
    };

    if (!enabled || !senderName) {
      resetTitle();
      return;
    }

    const frames = [
      `Neue Nachricht von ${senderName}`,
      `• Neue Nachricht von ${senderName}`,
      `💬 Neue Nachricht von ${senderName}`,
      originalTitleRef.current,
    ];

    let i = 0;
    document.title = frames[0];

    intervalRef.current = window.setInterval(() => {
      i = (i + 1) % frames.length;
      document.title = frames[i];
    }, 1000);

    return () => {
      resetTitle();
    };
  }, [enabled, senderName, baseTitle]);
}
