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
import { useCards, useLatestStats } from "../../hooks/useStats";
import { api } from "../../lib/api";
import StatCard from "../../components/cards/StatCard";
import AddCardModal from "../../components/cards/AddCardModal";
import MainChart from "../../components/chart/MainChart";
import CoachesPage from "./CoachesPage";
import WeatherClock from "../../components/layout/WeatherClock";

const STORAGE_KEY = "fittrack_selected_cards";

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
      {/* Drag indicator */}
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

  const toggleCardSelect = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getLatest = (cardId: string) => {
    const match = latestStats.find((s: any) => s.card._id === cardId);
    return match?.latest ?? null;
  };

  const activeCard = orderedCards.find((c) => c._id === activeId);

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

        {/* Center weather/date */}
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

          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Hey, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here's your performance overview
          </p>
        </div>

        <MainChart
          key={orderedCards
            .map((c: any) => `${c._id}-${c.chartType}`)
            .join(",")}
          cards={orderedCards}
          selectedCardIds={selectedCardIds}
        />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Your metrics</h2>
            <div className="flex items-center gap-2">
              {/* Arrange toggle */}
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
                      latest={getLatest(card._id)}
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
                      latest={getLatest(activeCard._id)}
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
                  latest={getLatest(card._id)}
                  selected={selectedCardIds.includes(card._id)}
                  onToggleSelect={() => toggleCardSelect(card._id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddModal && <AddCardModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
