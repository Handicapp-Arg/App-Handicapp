import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface PlanStatus {
  plan: string;
  plan_expires_at: string | null;
  horse_count: number;
  horse_limit: number | null;
  is_limited: boolean;
  label: string;
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

export function useAdminPlanUsers() {
  return useQuery<AdminPlanUser[]>({
    queryKey: ['admin-plan-users'],
    queryFn: async () => (await api.get('/plans/admin/users')).data,
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
