import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useChatUnread } from "../../hooks/useChatUnread";
import { useDocumentChatTitle } from "../../hooks/useDocumentChatTitle";

export default function GlobalChatNotifier() {
  const { user } = useAuth() as any;
  const { threads, totalUnread } = useChatUnread();

  const [titleAlertName, setTitleAlertName] = useState<string | null>(null);
  const [titleAlertEnabled, setTitleAlertEnabled] = useState(false);

  const prevUnreadRef = useRef(0);
  const prevThreadsRef = useRef<string>("");

  useDocumentChatTitle({
    senderName: titleAlertName,
    enabled: titleAlertEnabled,
    baseTitle: "AthletiQ",
  });

  useEffect(() => {
    if (!user) {
      setTitleAlertEnabled(false);
      setTitleAlertName(null);
      prevUnreadRef.current = 0;
      prevThreadsRef.current = "";
      return;
    }

    const threadSnapshot = JSON.stringify(
      threads.map((t) => ({
        id: t._id,
        unreadCount: t.unreadCount ?? 0,
        lastMessageAt: t.lastMessageAt ?? "",
        otherUserName: t.otherUser?.name ?? "",
      }))
    );

    if (prevThreadsRef.current && threadSnapshot !== prevThreadsRef.current) {
      const previousMap = new Map<
        string,
        { unreadCount: number; otherUserName: string }
      >();

      try {
        const prevParsed = JSON.parse(prevThreadsRef.current) as Array<{
          id: string;
          unreadCount: number;
          lastMessageAt: string;
          otherUserName: string;
        }>;

        prevParsed.forEach((item) => {
          previousMap.set(item.id, {
            unreadCount: item.unreadCount,
            otherUserName: item.otherUserName,
          });
        });
      } catch {
        //
      }

      const increasedThread = threads.find((thread) => {
        const prev = previousMap.get(thread._id);
        const prevUnread = prev?.unreadCount ?? 0;
        const nextUnread = thread.unreadCount ?? 0;
        return nextUnread > prevUnread;
      });

      if (increasedThread && document.hidden) {
        setTitleAlertName(increasedThread.otherUser?.name ?? "einem Chat");
        setTitleAlertEnabled(true);
      }
    }

    prevThreadsRef.current = threadSnapshot;
    prevUnreadRef.current = totalUnread;
  }, [threads, totalUnread, user]);

  useEffect(() => {
    const resetTitleAlert = () => {
      if (!document.hidden) {
        setTitleAlertEnabled(false);
        setTitleAlertName(null);
      }
    };

    window.addEventListener("focus", resetTitleAlert);
    document.addEventListener("visibilitychange", resetTitleAlert);

    return () => {
      window.removeEventListener("focus", resetTitleAlert);
      document.removeEventListener("visibilitychange", resetTitleAlert);
    };
  }, []);

  return null;
}
