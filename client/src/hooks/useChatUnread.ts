import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./useAuth";
import { getSocket } from "../lib/socket";
import { ChatThread } from "../types/chat";

type AiThreadResponse = {
  thread?: {
    _id: string;
    unreadCount?: number;
    lastMessage?: string;
    lastMessageAt?: string;
    title?: string;
  };
};

export function useChatUnread() {
  const { token, user } = useAuth() as any;
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [aiUnread, setAiUnread] = useState(0);

  const currentUserId = user?._id || user?.id || "";
  const isAthlete = user?.role === "athlete";

  const loadThreads = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setAiUnread(0);
      return;
    }

    try {
      const [{ data: chatData }, aiResult] = await Promise.all([
        api.get("/chat/threads"),
        isAthlete ? api.get("/ai/thread") : Promise.resolve(null),
      ]);

      setThreads(chatData.data ?? []);

      if (isAthlete && aiResult?.data?.data) {
        const payload = aiResult.data.data as AiThreadResponse;
        setAiUnread(payload.thread?.unreadCount ?? 0);
      } else {
        setAiUnread(0);
      }
    } catch (error) {
      console.error("Failed to load unread chat threads", error);
    }
  }, [user, isAthlete]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!token || !user) return;

    const socket = getSocket(token);

    const refreshFromServer = () => {
      loadThreads();
    };

    const onNewMessage = (payload: any) => {
      const message = payload?.data;
      if (!message) return;

      const isOwn = message.senderId === currentUserId;

      setThreads((prev) => {
        const exists = prev.some((thread) => thread._id === message.threadId);

        if (!exists) {
          queueMicrotask(() => {
            loadThreads();
          });
          return prev;
        }

        return prev.map((thread) =>
          thread._id === message.threadId
            ? {
                ...thread,
                lastMessage: message.text,
                lastMessageAt: message.createdAt,
                unreadCount: isOwn
                  ? thread.unreadCount ?? 0
                  : (thread.unreadCount ?? 0) + 1,
              }
            : thread
        );
      });

      queueMicrotask(() => {
        loadThreads();
      });
    };

    socket.on("connect", refreshFromServer);
    socket.on("chat:message:new", onNewMessage);

    return () => {
      socket.off("connect", refreshFromServer);
      socket.off("chat:message:new", onNewMessage);
    };
  }, [token, user, currentUserId, loadThreads]);

  useEffect(() => {
    const onRefresh = () => {
      loadThreads();
    };

    window.addEventListener("chat:threads:refresh", onRefresh);

    return () => {
      window.removeEventListener("chat:threads:refresh", onRefresh);
    };
  }, [loadThreads]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      loadThreads();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, loadThreads]);

  const totalUnread = useMemo(() => {
    const threadUnread = threads.reduce(
      (sum, thread) => sum + (thread.unreadCount ?? 0),
      0
    );

    return threadUnread + aiUnread;
  }, [threads, aiUnread]);

  return {
    threads,
    totalUnread,
    aiUnread,
    setThreads,
    refreshThreads: loadThreads,
  };
}
