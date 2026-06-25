import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface SuperAdminMetrics {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_horses: number;
  mrr_ars: number;
  arr_ars: number;
  by_plan: Record<string, number>;
  new_orgs_30d: number;
  suspended_count: number;
  expired_count: number;
  avg_horses_per_org: number;
}

export type OrgPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type OrgStatus = 'active' | 'suspended' | 'trial';

export interface SuperAdminOrg {
  id: string;
  name: string;
  plan: OrgPlan;
  status: OrgStatus;
  plan_expires_at: string | null;
  horse_count: number;
  member_count: number;
  owner: { id: string; name: string; email: string } | null;
  created_at: string;
  monthly_revenue_ars: number;
}

export function useSuperAdminMetrics(enabled = true) {
  return useQuery<SuperAdminMetrics>({
    queryKey: ['superadmin', 'metrics'],
    queryFn: async () => (await api.get('/superadmin/metrics')).data,
    staleTime: 30_000,
    enabled,
  });
}

export function useSuperAdminOrgs(filters?: { search?: string; plan?: string }, enabled = true) {
  return useQuery<SuperAdminOrg[]>({
    queryKey: ['superadmin', 'orgs', filters],
    queryFn: async () => (await api.get('/superadmin/organizations', { params: filters })).data,
    enabled,
  });
}

export function useSetOrgStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrgStatus }) =>
      (await api.patch(`/superadmin/organizations/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  });
}
