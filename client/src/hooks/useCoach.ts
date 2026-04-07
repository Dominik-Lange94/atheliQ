import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useMyCoaches = () =>
  useQuery({
    queryKey: ["my-coaches"],
    queryFn: async () => {
      const { data } = await api.get("/coach/my-coaches");
      return data.data as any[];
    },
  });

export const useSearchCoach = () =>
  useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.get(
        `/coach/search?email=${encodeURIComponent(email)}`
      );
      return data.data;
    },
  });

export const useConnectCoach = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (coachId: string) => {
      const { data } = await api.post(`/coach/connect/${coachId}`);
      return data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-coaches"] }),
        qc.invalidateQueries({ queryKey: ["chat-threads"] }),
      ]);
      window.dispatchEvent(new Event("chat:threads:refresh"));
    },
  });
};

export const useUpdatePermissions = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      coachId,
      allowedMetrics,
    }: {
      coachId: string;
      allowedMetrics: string[];
    }) => {
      const { data } = await api.patch(`/coach/permissions/${coachId}`, {
        allowedMetrics,
      });
      return data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-coaches"] }),
        qc.invalidateQueries({ queryKey: ["chat-threads"] }),
      ]);
      window.dispatchEvent(new Event("chat:threads:refresh"));
    },
  });
};

export const useDisconnectCoach = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (coachId: string) => {
      const { data } = await api.delete(`/coach/disconnect/${coachId}`);
      return data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-coaches"] }),
        qc.invalidateQueries({ queryKey: ["chat-threads"] }),
      ]);
      window.dispatchEvent(new Event("chat:threads:refresh"));
    },
  });
};
