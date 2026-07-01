import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

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

export interface AdminPlanUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  plan_expires_at: string | null;
  horse_count: number;
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

export function useAdminPlanUsers(enabled = true) {
  return useQuery<AdminPlanUser[]>({
    queryKey: ['admin-plan-users'],
    queryFn: async () => (await api.get('/plans/admin/users')).data,
    enabled,
  });
}

export function useAdminSetPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, plan, months }: { userId: string; plan: 'free' | 'pro'; months?: number }) =>
      (await api.patch(`/plans/admin/${userId}`, { plan, months })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plan-users'] });
    },
  });
}
