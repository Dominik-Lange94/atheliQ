import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  useCards,
  useLatestStats,
  useDayStats,
  useReorderCards,
} from "../../hooks/useStats";
import { useChatUnread } from "../../hooks/useChatUnread";
import StatCard from "../../components/cards/StatCard";
import AddCardModal from "../../components/cards/AddCardModal";
import MainChart from "../../components/chart/MainChart";
import CoachesPage from "./CoachesPage";
import WeatherClock from "../../components/layout/WeatherClock";
import MobileConnectModal from "../../components/auth/MobileConnectModal";
import MotivationBot from "../../components/ui/MotivationBot";
import ThemeToggle from "../../components/layout/ThemeToggle";
import BrandLogo from "../../components/layout/BrandLogo";

const STORAGE_KEY = "spaq_selected_cards";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const TODAY = toDateStr(new Date());

function getInitials(name?: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatDateDisplay(dateStr: string): string {
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === TODAY) return "Heute";
  if (dateStr === yesterday) return "Gestern";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function buildDayWindow(
  windowOffset: number
): { dateStr: string; day: number; weekday: string }[] {
  const days = [];
  for (let i = windowOffset - 7; i <= windowOffset; i++) {
    const d = new Date(TODAY + "T12:00:00");
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: toDateStr(d),
      day: d.getDate(),
      weekday: d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2),
    });
  }
  return days;
}

function SortableStatCard({
  card,
  latest,
  selected,
  onToggleSelect,
  selectedDate,
}: {
  card: any;
  latest: any;
  selected: boolean;
  onToggleSelect: () => void;
  selectedDate?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-0" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-[#FFD300]/40 ring-dashed pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1">
          <svg
            className="h-3 w-3 text-[#FFD300]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span className="text-[10px] font-medium text-[#FFD300]">Ziehen</span>
        </div>
      </div>

      <div className="pointer-events-none opacity-60">
        <StatCard
          card={card}
          latest={latest}
          selected={selected}
          onToggleSelect={onToggleSelect}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}

export default function AthleteDashboard() {
  const { user, logout } = useAuth();
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const reorderCards = useReorderCards();
  const { data: latestStats = [] } = useLatestStats();
  const { totalUnread } = useChatUnread();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCoaches, setShowCoaches] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [orderedCards, setOrderedCards] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMobileConnect, setShowMobileConnect] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);
  const [showCalendar, setShowCalendar] = useState(false);
  const [windowOffset, setWindowOffset] = useState<number>(0);

  const isToday = selectedDate === TODAY;
  const dayWindow = buildDayWindow(windowOffset);
  const { data: dayStats = [], isLoading: dayLoading } =
    useDayStats(selectedDate);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (arrangeMode || activeId) return;
    if (cards.length > 0) {
      setOrderedCards([...cards].sort((a: any, b: any) => a.order - b.order));
    } else {
      setOrderedCards([]);
    }
  }, [cards, arrangeMode, activeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCardIds));
  }, [selectedCardIds]);

  useEffect(() => {
    if (cards.length > 0) {
      const validIds = cards.map((c: any) => c._id);
      setSelectedCardIds((prev) => prev.filter((id) => validIds.includes(id)));
    }
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setOrderedCards((prev) => {
      const oldIndex = prev.findIndex((c) => c._id === active.id);
      const newIndex = prev.findIndex((c) => c._id === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newOrder = arrayMove(prev, oldIndex, newIndex);
      reorderCards.mutate(newOrder);
      return newOrder;
    });
  };

  const toggleCardSelect = (id: string) =>
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const getDayValue = (cardId: string) => {
    const match = dayStats.find((s: any) => s.card._id === cardId);
    return match?.entry ?? null;
  };

  const getLatest = (cardId: string) => {
    const match = latestStats.find((s: any) => s.card._id === cardId);
    return match?.latest ?? null;
  };

  const shiftWindowLeft = () => setWindowOffset((o) => o - 1);

  const shiftWindowRight = () => {
    if (windowOffset < 0) setWindowOffset((o) => o + 1);
  };

  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const diffDays = Math.round(
      (new Date(dateStr + "T12:00:00").getTime() -
        new Date(TODAY + "T12:00:00").getTime()) /
        86400000
    );
    setWindowOffset(Math.min(diffDays, 0));
    setShowCalendar(false);
  };

  const goToPrevDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const newDate = toDateStr(d);
    setSelectedDate(newDate);

    if (!buildDayWindow(windowOffset).find((day) => day.dateStr === newDate)) {
      setWindowOffset((o) => o - 1);
    }
  };

  const goToNextDay = () => {
    if (isToday) return;

    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const newDate = toDateStr(d);

    if (newDate <= TODAY) {
      setSelectedDate(newDate);
      if (
        !buildDayWindow(windowOffset).find((day) => day.dateStr === newDate)
      ) {
        setWindowOffset((o) => Math.min(o + 1, 0));
      }
    }
  };

  const activeCard = orderedCards.find((c) => c._id === activeId);
  const hasAnyData = latestStats.some((s: any) => s.latest !== null);

  if (showCoaches) {
    return <CoachesPage onClose={() => setShowCoaches(false)} />;
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="relative flex items-center justify-between border-b border-subtle px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <BrandLogo showText={false} imageClassName="h-8 w-auto" />
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/chat"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface transition-all hover:border-strong hover:bg-surface-2"
            title="Nachrichten"
          >
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M8 10h8M8 14h5m-6 6l-3-3V7a3 3 0 013-3h12a3 3 0 013 3v7a3 3 0 01-3 3h-8l-4 3z"
              />
            </svg>

            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFD300] px-1.5 text-[10px] font-extrabold text-[#0f0f13] shadow-lg">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface transition-all hover:border-strong hover:bg-surface-2"
              title="Profilmenü"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD300] text-sm font-bold text-[#0f0f13]">
                {getInitials(user?.name)}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-subtle bg-surface shadow-2xl shadow-black/30">
                <div className="border-b border-subtle px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFD300] text-sm font-bold text-[#0f0f13]">
                      {getInitials(user?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    to="/athlete/settings/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-all hover:bg-surface-2 hover:text-primary"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M5.121 17.804A9 9 0 1118.88 17.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Profil
                  </Link>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowCoaches(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-all hover:bg-surface-2 hover:text-primary"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Coaches
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowMobileConnect(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-all hover:bg-surface-2 hover:text-primary"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M12 18h.01M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"
                      />
                    </svg>
                    Mobile verbinden
                  </button>

                  <div className="my-2 h-px bg-[var(--border-subtle)]" />

                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-3 text-sm text-secondary">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.7}
                          d="M12 3v1m0 16v1m8.66-10h-1M4.34 12h-1m15.02 6.02l-.7-.7M6.34 6.34l-.7-.7m12.02 0l-.7.7M6.34 17.66l-.7.7M12 7a5 5 0 100 10 5 5 0 000-10z"
                        />
                      </svg>
                      Design
                    </div>

                    <ThemeToggle />
                  </div>

                  <div className="my-2 h-px bg-[var(--border-subtle)]" />

                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-500 transition-all hover:bg-rose-500/10"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.7}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                      />
                    </svg>
                    Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              Hey, {user?.name?.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted">Deine Leistungsübersicht</p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3 rounded-xl py-2.5">
            <WeatherClock />
          </div>
        </div>
        <div className="rounded-2xl border border-subtle bg-surface p-3">
          <div className="flex items-center gap-2">
            {/* ← scrolls window AND selects previous day */}
            <button
              onClick={() => {
                shiftWindowLeft();
                goToPrevDay();
              }}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-sm text-secondary transition-all hover:border-strong hover:text-primary"
            >
              ←
            </button>

            <div className="flex flex-1 flex-col gap-1">
              {/* Month label — show month of first visible day */}
              <p className="px-1 text-[10px] font-medium text-muted">
                {new Date(dayWindow[0].dateStr + "T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
              </p>

              <div className="flex gap-1">
                {dayWindow.map(({ dateStr, day, weekday }) => {
                  const isSel = dateStr === selectedDate;
                  const isT = dateStr === TODAY;
                  const isFuture = dateStr > TODAY;
                  const d = new Date(dateStr + "T12:00:00");
                  // Show month abbreviation when day is 1st or first in window
                  const showMonth = d.getDate() === 1;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isFuture && selectDate(dateStr)}
                      disabled={isFuture}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-all ${
                        isSel
                          ? "border-[#FFD300]/40 bg-[#FFD300]/12"
                          : isT
                          ? "border-subtle bg-surface-2 hover:border-strong"
                          : isFuture
                          ? "cursor-not-allowed border-transparent opacity-20"
                          : "border-transparent hover:border-subtle hover:bg-surface-2"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-medium uppercase tracking-wide ${
                          isSel ? "text-[#FFD300]" : isT ? "text-secondary" : "text-muted"
                        }`}
                      >
                        {weekday}
                      </span>

                      <span
                        className={`text-xs font-semibold leading-none ${
                          isSel ? "text-[#FFD300]" : isT ? "text-primary" : "text-secondary"
                        }`}
                      >
                        {day}
                      </span>

                      {showMonth && (
                        <span className="text-[8px] text-muted leading-none mt-0.5">
                          {d.toLocaleDateString("de-DE", { month: "short" })}
                        </span>
                      )}

                      {isT && !isSel && !showMonth && (
                        <span className="mt-0.5 h-1 w-1 rounded-full bg-[#FFD300]/50" />
                      )}
                      {isSel && !showMonth && (
                        <span className="mt-0.5 h-1 w-1 rounded-full bg-[#FFD300]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* → scrolls window AND selects next day */}
            <button
              onClick={() => {
                shiftWindowRight();
                goToNextDay();
              }}
              disabled={windowOffset >= 0 && isToday}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-sm text-secondary transition-all hover:border-strong hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        <MainChart
          key={orderedCards
            .map((c: any) => `${c._id}-${c.chartType}`)
            .join(",")}
          cards={orderedCards}
          selectedCardIds={selectedCardIds}
          selectedDate={selectedDate}
        />

        <MotivationBot hasData={hasAnyData} selectedDate={selectedDate} />

        <div>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex-shrink-0">
              <h2 className="font-medium text-primary">Deine Metriken</h2>
              <p className="mt-0.5 text-xs text-muted">
                {dayLoading
                  ? "Lade…"
                  : isToday
                  ? "Aktuellste Werte"
                  : formatDateDisplay(selectedDate)}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => setArrangeMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  arrangeMode
                    ? "border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]"
                    : "border-subtle bg-surface text-secondary hover:border-strong hover:text-primary"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                {arrangeMode ? "Fertig" : "Karten anordnen"}
              </button>

              {!arrangeMode && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#FFD300] px-3 py-1.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00]"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Karte hinzufügen
                </button>
              )}
            </div>
          </div>

          {cardsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-subtle bg-surface-2"
                />
              ))}
            </div>
          ) : orderedCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-subtle bg-surface p-12 text-center">
              <p className="text-sm text-muted">
                Noch keine Karten — füge deine erste Metrik hinzu
              </p>
            </div>
          ) : arrangeMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedCards.map((c) => c._id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {orderedCards.map((card: any) => (
                    <SortableStatCard
                      key={card._id}
                      card={card}
                      latest={getDayValue(card._id) ?? getLatest(card._id)}
                      selected={selectedCardIds.includes(card._id)}
                      selectedDate={selectedDate}
                      onToggleSelect={() => {}}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
                {activeCard ? (
                  <div className="rotate-1 scale-105 shadow-2xl shadow-black/60">
                    <StatCard
                      card={activeCard}
                      latest={
                        getDayValue(activeCard._id) ?? getLatest(activeCard._id)
                      }
                      selectedDate={selectedDate}
                      selected={selectedCardIds.includes(activeCard._id)}
                      onToggleSelect={() => {}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {orderedCards.map((card: any) => (
                <StatCard
                  key={card._id}
                  card={card}
                  latest={getDayValue(card._id) ?? getLatest(card._id)}
                  selectedDate={selectedDate}
                  selected={selectedCardIds.includes(card._id)}
                  onToggleSelect={() => toggleCardSelect(card._id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddModal && <AddCardModal onClose={() => setShowAddModal(false)} />}
      {showMobileConnect && (
        <MobileConnectModal onClose={() => setShowMobileConnect(false)} />
      )}

      {showCalendar && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
