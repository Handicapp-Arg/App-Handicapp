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

export function useUpsertTrainingMetrics() {
  const qc = useQueryClient();
  return useMutation({
    // El `eventId` se recibe en la mutación (no en la construcción del hook):
    // en el flujo "registrar monta" el evento se crea recién al guardar, así
    // que su id no se conoce al montar el hook. Recibirlo acá evita el estado
    // inválido de instanciar con un id vacío.
    mutationFn: async ({ eventId, ...dto }: {
      eventId: string;
      distance_km?: number;
      duration_min?: number;
      intensity?: number;
      discipline?: string;
    }) => {
      const { data } = await api.post(`/events/${eventId}/training-metrics`, dto);
      return data as TrainingMetrics;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['training-metrics', variables.eventId] });
      qc.invalidateQueries({ queryKey: ['training-history'] });
    },
  });
}

/** Una monta del historial: evento de entrenamiento + sus métricas. */
export interface TrainingHistoryItem {
  id: string;
  date: string;            // YYYY-MM-DD
  event_time: string | null;
  description: string | null;
  distance_km: number | null;
  duration_min: number | null;
  intensity: number | null;
  discipline: string | null;
}

/**
 * Historial de montas de un caballo (entrenamientos + métricas), ordenado por
 * fecha desc. Consume `GET /events/horse/:horseId/training-history`.
 */
export function useTrainingHistory(horseId: string) {
  return useQuery<TrainingHistoryItem[]>({
    queryKey: ['training-history', horseId],
    queryFn: async () => {
      const { data } = await api.get(`/events/horse/${horseId}/training-history`);
      // El backend devuelve { summary, items }; la pantalla arma su propio resumen desde la lista.
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      return list as TrainingHistoryItem[];
    },
    enabled: !!horseId,
    staleTime: 30_000,
  });
}
