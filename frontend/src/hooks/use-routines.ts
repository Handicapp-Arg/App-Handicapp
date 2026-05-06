import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface DailyRoutine {
  id: string;
  horse_id: string;
  date: string;
  morning_feed: boolean;
  afternoon_feed: boolean;
  evening_feed: boolean;
  water_ok: boolean;
  paddock: boolean;
  trained: boolean;
  health_check: boolean;
  observations: string | null;
  filler?: { id: string; name: string };
  created_at: string;
}

export function useRoutines(horseId: string, limit = 30) {
  return useQuery<DailyRoutine[]>({
    queryKey: ['routines', horseId],
    queryFn: async () => (await api.get(`/horses/${horseId}/routines?limit=${limit}`)).data,
    enabled: !!horseId,
  });
}

export function useUpsertRoutine(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Omit<DailyRoutine, 'id' | 'horse_id' | 'filler' | 'created_at'>>) => {
      const { data } = await api.post(`/horses/${horseId}/routines`, dto);
      return data as DailyRoutine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines', horseId] }),
  });
}
