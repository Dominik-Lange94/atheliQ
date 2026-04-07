import { useState, useEffect } from "react";
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
import { useAuth } from "../../hooks/useAuth";
import { useCards, useLatestStats, useDayStats } from "../../hooks/useStats";
import { api } from "../../lib/api";
import StatCard from "../../components/cards/StatCard";
import AddCardModal from "../../components/cards/AddCardModal";
import MainChart from "../../components/chart/MainChart";
import CoachesPage from "./CoachesPage";
import WeatherClock from "../../components/layout/WeatherClock";
import MobileConnectModal from "../../components/auth/MobileConnectModal";
import MotivationBot from "../../components/ui/MotivationBot";
import { Link } from "react-router-dom";
import { useChatUnread } from "../../hooks/useChatUnread";

const STORAGE_KEY = "fittrack_selected_cards";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const TODAY = toDateStr(new Date());

function formatDateDisplay(dateStr: string): string {
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Heute";
  if (dateStr === yesterday) return "Gestern";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

// Build 8-day window centered on selectedDate, but always including today.
// The window scrolls left/right based on windowOffset (days from today).
function buildDayWindow(
  windowOffset: number
): { dateStr: string; day: number; weekday: string }[] {
  const days = [];
  // Show 8 days: from (today + windowOffset - 7) to (today + windowOffset)
  const end = windowOffset; // offset from today
  const start = end - 7; // 8 days total
  for (let i = start; i <= end; i++) {
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
}: {
  card: any;
  latest: any;
  selected: boolean;
  onToggleSelect: () => void;
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="bg-black/60 rounded-lg px-2 py-1 flex items-center gap-1.5">
          <svg
            className="w-3 h-3 text-[#FFD300]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span className="text-[10px] text-[#FFD300] font-medium">Ziehen</span>
        </div>
      </div>
      <div className="pointer-events-none opacity-60">
        <StatCard
          card={card}
          latest={latest}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  );
}

export default function AthleteDashboard() {
  const { user, logout } = useAuth();
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: latestStats = [] } = useLatestStats();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCoaches, setShowCoaches] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [orderedCards, setOrderedCards] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMobileConnect, setShowMobileConnect] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);

  // windowOffset: how many days the 8-day window is shifted from today
  // 0 = window ends today, -1 = window ends yesterday, etc.
  const [windowOffset, setWindowOffset] = useState<number>(0);

  const isToday = selectedDate === TODAY;
  const dayWindow = buildDayWindow(windowOffset);
  const { data: dayStats = [], isLoading: dayLoading } =
    useDayStats(selectedDate);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (cards.length > 0) {
      setOrderedCards((prev) => {
        if (prev.length === 0) return [...cards];
        const ids = cards.map((c: any) => c._id);
        const prevIds = prev.map((c: any) => c._id);
        const reordered = prev
          .filter((c: any) => ids.includes(c._id))
          .map((c: any) => cards.find((fc: any) => fc._id === c._id) ?? c);
        const newCards = cards.filter((c: any) => !prevIds.includes(c._id));
        return [...reordered, ...newCards];
      });
    }
  }, [cards]);

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

  const handleDragStart = (e: DragStartEvent) =>
    setActiveId(e.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedCards((prev) => {
      const oldIndex = prev.findIndex((c) => c._id === active.id);
      const newIndex = prev.findIndex((c) => c._id === over.id);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      api
        .patch("/athlete/cards/reorder", {
          order: newOrder.map((c, i) => ({ id: c._id, order: i })),
        })
        .catch(console.error);
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

  // Pagination: shift window left/right
  const shiftWindowLeft = () => {
    setWindowOffset((o) => o - 1);
  };
  const shiftWindowRight = () => {
    // Don't go past today (windowOffset max = 0)
    if (windowOffset < 0) setWindowOffset((o) => o + 1);
  };

  // When selecting a date outside current window, re-center window
  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    // Compute offset of selected date from today
    const todayMs = new Date(TODAY + "T12:00:00").getTime();
    const selectedMs = new Date(dateStr + "T12:00:00").getTime();
    const diffDays = Math.round((selectedMs - todayMs) / 86400000);
    // Keep window so selected date is visible (within window end offset)
    // Window shows [offset-7 .. offset], offset <= 0
    const windowEnd = Math.min(diffDays, 0); // never past today
    setWindowOffset(windowEnd);
  };

  // Top-right pagination (← →) moves selected date and re-centers window
  const goToPrevDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const newDate = toDateStr(d);
    setSelectedDate(newDate);
    // If new date is outside window, shift window
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
  const { totalUnread } = useChatUnread();

  if (showCoaches) return <CoachesPage onClose={() => setShowCoaches(false)} />;

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <header className="relative border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          <span className="text-white font-medium">AthletiQ</span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center">
          <WeatherClock />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCoaches(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Coaches
          </button>
          <span className="text-slate-400 text-sm hidden sm:block">
            {user?.name}
          </span>
          <Link
            to="/chat"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
            title="Nachrichten"
          >
            <svg
              className="w-5 h-5 text-white"
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

            {totalUnread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-[#FFD300] text-[#0f0f13] text-[10px] font-extrabold flex items-center justify-center shadow-lg">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            ) : null}
          </Link>
          <button
            onClick={() => setShowMobileConnect(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            Mobile verbinden
          </button>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Greeting + Option A date control */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Hey, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Here's your performance overview
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-3 py-2 flex-shrink-0">
            <button
              onClick={goToPrevDay}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm"
            >
              ←
            </button>
            <div className="text-center min-w-[130px]">
              <p className="text-white text-sm font-medium leading-tight">
                {formatDateDisplay(selectedDate)}
              </p>
              {!isToday && (
                <p className="text-slate-500 text-xs">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                    "de-DE",
                    { day: "2-digit", month: "2-digit", year: "2-digit" }
                  )}
                </p>
              )}
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              →
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button
              onClick={() => {
                setSelectedDate(TODAY);
                setWindowOffset(0);
              }}
              disabled={isToday}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                isToday
                  ? "border-white/5 text-slate-600 cursor-not-allowed"
                  : "border-[#FFD300]/30 text-[#FFD300] hover:border-[#FFD300]/60 hover:bg-[#FFD300]/5"
              }`}
            >
              Heute
            </button>
          </div>
        </div>

        {/* Main chart */}
        <MainChart
          key={orderedCards
            .map((c: any) => `${c._id}-${c.chartType}`)
            .join(",")}
          cards={orderedCards}
          selectedCardIds={selectedCardIds}
          selectedDate={selectedDate}
        />

        {/* Motivation bot */}
        <MotivationBot hasData={hasAnyData} selectedDate={selectedDate} />

        {/* Cards section */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex-shrink-0">
              <h2 className="text-white font-medium">Your metrics</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {dayLoading
                  ? "Lade…"
                  : isToday
                  ? "Aktuellste Werte"
                  : formatDateDisplay(selectedDate)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setArrangeMode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  arrangeMode
                    ? "bg-[#FFD300]/10 border-[#FFD300]/40 text-[#FFD300]"
                    : "bg-transparent border-white/20 text-slate-400 hover:text-white hover:border-white/30"
                }`}
              >
                <svg
                  className="w-3.5 h-3.5"
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
                {arrangeMode ? "Fertig" : "Arrange cards"}
              </button>
              {!arrangeMode && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFD300] hover:bg-[#e6be00] text-[#0f0f13] text-sm font-medium transition-colors"
                >
                  <svg
                    className="w-4 h-4"
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
                  Add card
                </button>
              )}
            </div>
          </div>

          {cardsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : orderedCards.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">
                No cards yet — add your first metric above
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {orderedCards.map((card: any) => (
                    <SortableStatCard
                      key={card._id}
                      card={card}
                      latest={getDayValue(card._id) ?? getLatest(card._id)}
                      selectedDate={selectedDate}
                      selected={selectedCardIds.includes(card._id)}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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

        {/* Day strip — below cards, with border and pagination */}
        <div className="border border-white/10 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            {/* Scroll left */}
            <button
              onClick={shiftWindowLeft}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all flex-shrink-0 text-sm"
            >
              ←
            </button>

            {/* Day buttons */}
            <div className="flex-1 flex gap-1">
              {dayWindow.map(({ dateStr, day, weekday }) => {
                const isSelected = dateStr === selectedDate;
                const isT = dateStr === TODAY;
                const isFuture = dateStr > TODAY;
                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && selectDate(dateStr)}
                    disabled={isFuture}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-[#FFD300]/12 border-[#FFD300]/40"
                        : isT
                        ? "bg-white/5 border-white/15 hover:border-white/25"
                        : isFuture
                        ? "border-transparent opacity-20 cursor-not-allowed"
                        : "border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-medium uppercase tracking-wide ${
                        isSelected
                          ? "text-[#FFD300]"
                          : isT
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {weekday}
                    </span>
                    <span
                      className={`text-xs font-semibold leading-none ${
                        isSelected
                          ? "text-[#FFD300]"
                          : isT
                          ? "text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {day}
                    </span>
                    {isT && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#FFD300]/50 mt-0.5" />
                    )}
                    {isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#FFD300] mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scroll right — disabled when window already ends at today */}
            <button
              onClick={shiftWindowRight}
              disabled={windowOffset >= 0}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              →
            </button>
          </div>
        </div>
      </main>

      {showAddModal && <AddCardModal onClose={() => setShowAddModal(false)} />}
      {showMobileConnect && (
        <MobileConnectModal onClose={() => setShowMobileConnect(false)} />
      )}
    </div>
  );
}
