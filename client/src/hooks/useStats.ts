import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CreateStatCardInput, CreateStatEntryInput } from '@shared/schemas'

// ─── Cards ────────────────────────────────────────────────────────────────────

export const useCards = () =>
  useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data } = await api.get('/athlete/cards')
      return data.data
    },
  })

export const useAddCard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStatCardInput) => api.post('/athlete/cards', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  })
}

export const useRemoveCard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/athlete/cards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['latest'] })
    },
  })
}

// ─── Latest values ────────────────────────────────────────────────────────────

export const useLatestStats = () =>
  useQuery({
    queryKey: ['latest'],
    queryFn: async () => {
      const { data } = await api.get('/stats/latest')
      return data.data as { card: any; latest: any }[]
    },
  })

// ─── Entries for chart ────────────────────────────────────────────────────────

export const useCardEntries = (cardId: string | null) =>
  useQuery({
    queryKey: ['entries', cardId],
    queryFn: async () => {
      const { data } = await api.get(`/stats/entries/${cardId}`)
      return data.data
    },
    enabled: !!cardId,
  })

// ─── Log entry ────────────────────────────────────────────────────────────────

export const useLogEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStatEntryInput) => api.post('/stats/entries', input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['entries', vars.cardId] })
      qc.invalidateQueries({ queryKey: ['latest'] })
    },
  })
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export const useUpdateWeight = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (delta: number) => api.patch('/athlete/weight', { delta }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['latest'] }),
  })
}

// ─── Coach ────────────────────────────────────────────────────────────────────

export const useCoachAthletes = () =>
  useQuery({
    queryKey: ['coach-athletes'],
    queryFn: async () => {
      const { data } = await api.get('/coach/athletes')
      return data.data
    },
  })

export const useAthleteStats = (athleteId: string | null) =>
  useQuery({
    queryKey: ['athlete-stats', athleteId],
    queryFn: async () => {
      const { data } = await api.get(`/coach/athletes/${athleteId}/stats`)
      return data.data
    },
    enabled: !!athleteId,
  })

export const useMyCoaches = () =>
  useQuery({
    queryKey: ['my-coaches'],
    queryFn: async () => {
      const { data } = await api.get('/coach/my-coaches')
      return data.data
    },
  })

export const useUpdatePermissions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ coachId, allowedMetrics }: { coachId: string; allowedMetrics: string[] }) =>
      api.patch(`/coach/permissions/${coachId}`, { allowedMetrics }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-coaches'] }),
  })
}

// ─── Delete entry ─────────────────────────────────────────────────────────────

export const useDeleteEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, cardId }: { entryId: string; cardId: string }) =>
      api.delete(`/stats/entries/${entryId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['entries', vars.cardId] })
      qc.invalidateQueries({ queryKey: ['latest'] })
    },
  })
}

// ─── Edit card ────────────────────────────────────────────────────────────────

export const useEditCard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, label, color }: { id: string; label?: string; color?: string }) =>
      api.patch(`/athlete/cards/${id}`, { label, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['latest'] })
    },
  })
}
