import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./useAuth";
import { getSocket } from "../lib/socket";
import { ChatThread } from "../types/chat";

export function useChatUnread() {
  const { token, user } = useAuth() as any;
  const [threads, setThreads] = useState<ChatThread[]>([]);

  const currentUserId = user?._id || user?.id || "";

  const loadThreads = useCallback(async () => {
    if (!user) {
      setThreads([]);
      return;
    }

    try {
      const { data } = await api.get("/chat/threads");
      setThreads(data.data ?? []);
    } catch (error) {
      console.error("Failed to load unread chat threads", error);
    }
  }, [user]);

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

  const totalUnread = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0),
    [threads]
  );

  return {
    threads,
    totalUnread,
    setThreads,
    refreshThreads: loadThreads,
  };
}
