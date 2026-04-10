import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useAiMotivation = (selectedDate?: string) =>
  useQuery({
    queryKey: ["ai-motivation", selectedDate],
    queryFn: async () => {
      const qs = selectedDate
        ? `?date=${encodeURIComponent(selectedDate)}`
        : "";
      const { data } = await api.get(`/ai/motivation${qs}`);
      return data.data as {
        text: string;
        provider: "ollama" | "gemini";
        model: string;
      };
    },
    staleTime: 1000 * 60 * 5,
  });

export const useAiThread = () =>
  useQuery({
    queryKey: ["ai-thread"],
    queryFn: async () => {
      const { data } = await api.get("/ai/thread");
      return data.data as {
        thread: any;
        messages: any[];
      };
    },
  });

export const useSendAiMessage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      selectedDate,
    }: {
      text: string;
      selectedDate?: string;
    }) => {
      const { data } = await api.post("/ai/thread/messages", {
        text,
        selectedDate,
      });
      return data.data as {
        userMessage: any;
        assistantMessage: any;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-thread"] });
      qc.invalidateQueries({ queryKey: ["ai-motivation"] });
    },
  });
};
