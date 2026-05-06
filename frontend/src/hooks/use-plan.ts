import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PlanStatus {
  plan: string;
  plan_expires_at: string | null;
  horse_count: number;
  horse_limit: number | null;
  is_limited: boolean;
  label: string;
}

export function usePlanStatus() {
  return useQuery<PlanStatus>({
    queryKey: ['plan-status'],
    queryFn: async () => (await api.get('/plans/status')).data,
    staleTime: 60_000,
  });
}

export function useActivatePro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (months: number = 1) => (await api.post('/plans/activate-pro', { months })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-status'] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}
