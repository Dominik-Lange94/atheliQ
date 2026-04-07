import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import {
  ChatMessage,
  ChatMessagesResponseMeta,
  ChatThread,
} from "../../types/chat";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth() as any;

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesMeta, setMessagesMeta] =
    useState<ChatMessagesResponseMeta | null>(null);

  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState(false);

  const currentUserId = user?._id || user?.id || "";
  const currentUserRole = user?.role as "coach" | "athlete" | undefined;

  const activeThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?._id ?? null;
  }, [activeThread?._id]);

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [threads]);

  const notifyGlobalChatRefresh = () => {
    window.dispatchEvent(new Event("chat:threads:refresh"));
  };

  const markThreadAsRead = useCallback(async (threadId: string) => {
    try {
      await api.post(`/chat/threads/${threadId}/read`);

      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === threadId ? { ...thread, unreadCount: 0 } : thread
        )
      );

      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to mark thread as read", error);
    }
  }, []);

  const loadThreads = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setThreadsLoading(true);

      const { data } = await api.get("/chat/threads");
      const items = (data.data ?? []) as ChatThread[];
      const currentActiveId = activeThreadIdRef.current;

      const normalizedItems = items.map((thread) =>
        thread._id === currentActiveId ? { ...thread, unreadCount: 0 } : thread
      );

      setThreads(normalizedItems);

      setActiveThread((prev) => {
        if (normalizedItems.length === 0) return null;
        if (!prev) return normalizedItems[0];
        return (
          normalizedItems.find((t) => t._id === prev._id) ?? normalizedItems[0]
        );
      });
    } catch (error) {
      console.error("Failed to load chat threads", error);
    } finally {
      if (showLoader) setThreadsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (threadId: string, showLoader = false) => {
      try {
        if (showLoader) setMessagesLoading(true);

        const { data } = await api.get(`/chat/threads/${threadId}/messages`);
        setMessages((data.data ?? []) as ChatMessage[]);
        setMessagesMeta((data.meta ?? null) as ChatMessagesResponseMeta | null);

        setThreads((prev) =>
          prev.map((thread) =>
            thread._id === threadId
              ? {
                  ...thread,
                  relationStatus:
                    data.meta?.relationStatus ?? thread.relationStatus,
                }
              : thread
          )
        );

        await markThreadAsRead(threadId);
      } catch (error) {
        console.error("Failed to load messages", error);
      } finally {
        if (showLoader) setMessagesLoading(false);
      }
    },
    [markThreadAsRead]
  );

  useEffect(() => {
    loadThreads(true);
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThread?._id) {
      setMessages([]);
      setMessagesMeta(null);
      return;
    }

    loadMessages(activeThread._id, true);
  }, [activeThread?._id, loadMessages]);

  useEffect(() => {
    if (!activeThread?._id) return;

    setThreads((prev) =>
      prev.map((thread) =>
        thread._id === activeThread._id ? { ...thread, unreadCount: 0 } : thread
      )
    );

    void markThreadAsRead(activeThread._id);
  }, [activeThread?._id, messages.length, markThreadAsRead]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadThreads(false);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThread?._id) return;

    const interval = window.setInterval(async () => {
      try {
        const { data } = await api.get(
          `/chat/threads/${activeThread._id}/messages`
        );

        const nextMessages = (data.data ?? []) as ChatMessage[];

        let hasNewForeignMessage = false;

        setMessages((prev) => {
          const prevLast = prev[prev.length - 1];
          const nextLast = nextMessages[nextMessages.length - 1];

          if (
            nextLast &&
            (!prevLast || nextLast._id !== prevLast._id) &&
            nextLast.senderId !== currentUserId
          ) {
            hasNewForeignMessage = true;
          }

          return nextMessages;
        });

        setMessagesMeta((data.meta ?? null) as ChatMessagesResponseMeta | null);

        setThreads((prev) =>
          prev.map((thread) =>
            thread._id === activeThread._id
              ? {
                  ...thread,
                  relationStatus:
                    data.meta?.relationStatus ?? thread.relationStatus,
                }
              : thread
          )
        );

        if (hasNewForeignMessage) {
          await markThreadAsRead(activeThread._id);

          setThreads((prev) =>
            prev.map((thread) =>
              thread._id === activeThread._id
                ? { ...thread, unreadCount: 0 }
                : thread
            )
          );
        }
      } catch (error) {
        console.error("Failed to refresh active chat messages", error);
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [activeThread?._id, currentUserId, markThreadAsRead]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    const onConnectError = (err: any) => {
      console.error("socket connect error", err);
    };

    const onNewMessage = async (payload: {
      success: boolean;
      data: ChatMessage;
    }) => {
      const message = payload?.data;
      if (!message) return;

      const isActiveThread = activeThreadIdRef.current === message.threadId;
      const isOwnMessage = message.senderId === currentUserId;

      if (isActiveThread) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });

        if (!isOwnMessage) {
          await markThreadAsRead(message.threadId);
        }
      }

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread._id !== message.threadId) return thread;

          let nextRelationStatus = thread.relationStatus;

          if (message.meta?.type === "connect_accepted") {
            nextRelationStatus = "active";
          }

          if (message.meta?.type === "connect_declined") {
            nextRelationStatus = "revoked";
          }

          return {
            ...thread,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            relationStatus: nextRelationStatus,
            unreadCount:
              isActiveThread || isOwnMessage
                ? 0
                : (thread.unreadCount ?? 0) + 1,
          };
        })
      );
    };

    socket.on("connect_error", onConnectError);
    socket.on("chat:message:new", onNewMessage);

    return () => {
      socket.off("connect_error", onConnectError);
      socket.off("chat:message:new", onNewMessage);
    };
  }, [token, currentUserId, markThreadAsRead]);

  useEffect(() => {
    if (!token || !activeThread?._id) return;

    const socket = getSocket(token);
    socket.emit("chat:join", { threadId: activeThread._id });

    return () => {
      socket.emit("chat:leave", { threadId: activeThread._id });
    };
  }, [token, activeThread?._id]);

  const handleSendMessage = async (text: string) => {
    if (!activeThread?._id) return;
    if (messagesMeta?.relationStatus !== "active") return;

    try {
      setSending(true);

      const { data } = await api.post(
        `/chat/threads/${activeThread._id}/messages`,
        { text }
      );

      const message = data.data as ChatMessage;

      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === activeThread._id
            ? {
                ...thread,
                lastMessage: message.text,
                lastMessageAt: message.createdAt,
                unreadCount: 0,
              }
            : thread
        )
      );

      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeThread?._id) return;

    try {
      setResolvingRequest(true);

      await api.post(`/chat/threads/${activeThread._id}/accept`);

      await loadThreads(false);
      await loadMessages(activeThread._id, false);
      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to accept request", error);
    } finally {
      setResolvingRequest(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!activeThread?._id) return;

    try {
      setResolvingRequest(true);

      await api.post(`/chat/threads/${activeThread._id}/decline`);

      await loadThreads(false);
      await loadMessages(activeThread._id, false);
      notifyGlobalChatRefresh();
    } catch (error) {
      console.error("Failed to decline request", error);
    } finally {
      setResolvingRequest(false);
    }
  };

  const canCoachRespondToRequest =
    currentUserRole === "coach" &&
    messagesMeta?.relationStatus === "pending" &&
    messages.some(
      (m) => m.meta?.type === "connect_request" && m.meta?.actionRequired
    );

  const canSendNormalMessages = messagesMeta?.relationStatus === "active";

  const pendingInfoText =
    messagesMeta?.relationStatus === "pending"
      ? currentUserRole === "coach"
        ? "Offene Verbindungsanfrage. Du kannst sie annehmen oder ablehnen."
        : "Deine Verbindungsanfrage ist gesendet. Du bekommst die Antwort hier im Chat."
      : null;

  const handleBack = async () => {
    if (activeThread?._id) {
      await markThreadAsRead(activeThread._id);
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(user?.role === "coach" ? "/coach" : "/athlete");
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col">
      <header className="shrink-0 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            title="Zurück"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="w-8 h-8 rounded-xl bg-[#FFD300]/10 border border-[#FFD300]/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-[#FFD300]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          <div>
            <span className="text-white font-medium">AthletiQ Chat</span>
            <p className="text-slate-400 text-xs mt-0.5">
              Coach ↔ Athlete Kommunikation & Notifications
            </p>
          </div>
        </div>

        <div className="text-sm text-slate-400">{user?.name}</div>
      </header>

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="h-full min-h-0 flex flex-col lg:flex-row gap-5 lg:h-[calc(100vh-120px)]">
          <div
            className={`${
              activeThread ? "hidden lg:block" : "block"
            } w-full lg:w-[320px] lg:shrink-0 min-h-0`}
          >
            <div className="h-full min-h-0">
              <ChatSidebar
                threads={sortedThreads}
                activeThreadId={activeThread?._id ?? null}
                onSelect={setActiveThread}
                isLoading={threadsLoading}
              />
            </div>
          </div>

          <div
            className={`${
              activeThread ? "block" : "hidden lg:block"
            } flex-1 min-h-0`}
          >
            <div className="h-full min-h-0 flex flex-col">
              {activeThread && pendingInfoText && (
                <div className="mb-4 rounded-2xl border border-[#FFD300]/20 bg-[#FFD300]/8 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-xl bg-[#FFD300]/12 border border-[#FFD300]/20 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 text-[#FFD300]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.7}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#ffe88a] font-medium">
                        Verbindungsstatus
                      </p>
                      <p className="text-sm text-slate-300 mt-1">
                        {pendingInfoText}
                      </p>
                    </div>
                  </div>

                  {canCoachRespondToRequest && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={handleAcceptRequest}
                        disabled={resolvingRequest}
                        className="px-4 py-2.5 rounded-xl bg-[#FFD300] text-black font-medium hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolvingRequest
                          ? "Wird verarbeitet..."
                          : "Akzeptieren"}
                      </button>

                      <button
                        onClick={handleDeclineRequest}
                        disabled={resolvingRequest}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 min-h-0">
                <ChatWindow
                  thread={activeThread}
                  messages={messages}
                  currentUserId={currentUserId}
                  onSend={handleSendMessage}
                  isLoading={messagesLoading}
                  isSending={sending}
                  onBack={async () => {
                    if (activeThread?._id) {
                      await markThreadAsRead(activeThread._id);
                    }
                    setActiveThread(null);
                  }}
                  disableComposer={!canSendNormalMessages}
                  composerPlaceholder={
                    canSendNormalMessages
                      ? "Nachricht schreiben..."
                      : messagesMeta?.relationStatus === "pending"
                      ? "Normale Nachrichten sind erst nach Annahme möglich"
                      : "Dieser Chat ist nicht mehr aktiv"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
