import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type PlanFeature = 'whatsapp' | 'libreta_digital' | 'reportes' | 'reproductivo';
export type PlanRoleTarget = 'propietario' | 'veterinario' | 'establecimiento' | 'haras';

export interface PlanStatus {
  plan: string;
  plan_expires_at: string | null;
  horse_count: number;
  horse_limit: number | null;
  is_limited: boolean;
  label: string;
  features: string[];
  price_ars: number;
}

export interface Plan {
  id: string;
  role_target: PlanRoleTarget;
  tier_key: string;
  name: string;
  tier: number;
  price_ars: number;
  horse_limit: number | null;
  staff_limit: number | null;
  features: string[];
  active: boolean;
}

export function usePlanStatus() {
  return useQuery<PlanStatus>({
    queryKey: ['plan-status'],
    queryFn: async () => (await api.get('/plans/status')).data,
    staleTime: 60_000,
  });
}

export function usePlanCatalog() {
  return useQuery<Plan[]>({
    queryKey: ['plan-catalog'],
    queryFn: async () => (await api.get('/plans/catalog')).data,
    staleTime: 5 * 60_000,
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
