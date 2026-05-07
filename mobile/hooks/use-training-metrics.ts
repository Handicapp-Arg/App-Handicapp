import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface TrainingMetrics {
  id: string;
  event_id: string;
  distance_km: number | null;
  duration_min: number | null;
  intensity: number | null;
  discipline: string | null;
}

export function useTrainingMetrics(eventId: string) {
  return useQuery<TrainingMetrics | null>({
    queryKey: ['training-metrics', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/events/${eventId}/training-metrics`);
      return data ?? null;
    },
    enabled: !!eventId,
    staleTime: 60_000,
  });
}

export function useUpsertTrainingMetrics(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      distance_km?: number;
      duration_min?: number;
      intensity?: number;
      discipline?: string;
    }) => {
      const { data } = await api.post(`/events/${eventId}/training-metrics`, dto);
      return data as TrainingMetrics;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-metrics', eventId] }),
  });
}
