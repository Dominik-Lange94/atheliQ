import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateStatCardInput, CreateStatEntryInput } from "@shared/schemas";

// ─── Cards ────────────────────────────────────────────────────────────────────

export const useCards = () =>
  useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data } = await api.get("/athlete/cards");
      return data.data;
    },
    staleTime: 0,
  });

export const useAddCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStatCardInput) => api.post("/athlete/cards", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });
};

export const useRemoveCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/athlete/cards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
    },
  });
};

// ─── Latest values ────────────────────────────────────────────────────────────

export const useLatestStats = () =>
  useQuery({
    queryKey: ["latest"],
    queryFn: async () => {
      const { data } = await api.get("/stats/latest");
      return data.data as { card: any; latest: any }[];
    },
  });

// ─── Day stats ────────────────────────────────────────────────────────────────

export const useDayStats = (date: string) =>
  useQuery({
    queryKey: ["day", date],
    queryFn: async () => {
      const { data } = await api.get(`/stats/day?date=${date}`);
      return data.data as { card: any; entry: any }[];
    },
    staleTime: 0,
  });

// ─── Entries for chart ────────────────────────────────────────────────────────

export const useCardEntries = (
  cardId: string | null,
  opts?: { from?: string; to?: string }
) =>
  useQuery({
    queryKey: ["entries", cardId, opts?.from, opts?.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to)   params.set("to",   opts.to);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get(`/stats/entries/${cardId}${qs}`);
      return data.data;
    },
    enabled: !!cardId,
  });

// ─── Log entry ────────────────────────────────────────────────────────────────

export const useLogEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStatEntryInput) => api.post("/stats/entries", input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entries", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
    },
  });
};

// ─── Weight — date-aware ──────────────────────────────────────────────────────

export const useUpdateWeight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ delta, date }: { delta: number; date?: string }) =>
      api.patch("/athlete/weight", { delta, date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
};

// ─── Coach ────────────────────────────────────────────────────────────────────

export const useCoachAthletes = (userId?: string) =>
  useQuery({
    queryKey: ["coach-athletes", userId],
    queryFn: async () => {
      const { data } = await api.get("/coach/athletes");
      return data.data;
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

// Athlete stats with optional date range
export const useAthleteStats = (
  athleteId: string | null,
  opts?: { from?: string; to?: string }
) =>
  useQuery({
    queryKey: ["athlete-stats", athleteId, opts?.from, opts?.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to)   params.set("to",   opts.to);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get(`/coach/athletes/${athleteId}/stats${qs}`);
      // Return both stats data and activity flag
      return { stats: data.data, isActive: data.isActive ?? null };
    },
    enabled: !!athleteId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

// Activity status for all athletes in a date range
export const useAthletesActivity = (opts: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ["athletes-activity", opts.from, opts.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts.from) params.set("from", opts.from);
      if (opts.to)   params.set("to",   opts.to);
      const { data } = await api.get(`/coach/athletes/activity?${params.toString()}`);
      // Returns [{athleteId, isActive}]
      return data.data as { athleteId: string; isActive: boolean }[];
    },
    enabled: !!(opts.from || opts.to),
    staleTime: 30000,
  });

export const useMyCoaches = () =>
  useQuery({
    queryKey: ["my-coaches"],
    queryFn: async () => {
      const { data } = await api.get("/coach/my-coaches");
      return data.data;
    },
  });

export const useUpdatePermissions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ coachId, allowedMetrics }: { coachId: string; allowedMetrics: string[] }) =>
      api.patch(`/coach/permissions/${coachId}`, { allowedMetrics }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-coaches"] }),
  });
};

// ─── Delete entry ─────────────────────────────────────────────────────────────

export const useDeleteEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, cardId }: { entryId: string; cardId: string }) =>
      api.delete(`/stats/entries/${entryId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entries", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
    },
  });
};

// ─── Edit card ────────────────────────────────────────────────────────────────

export const useEditCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label, color, chartType }: { id: string; label?: string; color?: string; chartType?: string }) =>
      api.patch(`/athlete/cards/${id}`, { label, color, chartType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
    },
  });
};
