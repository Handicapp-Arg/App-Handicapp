'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { OrgPlan } from './use-organizations';

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

export interface SuperAdminOrg {
  id: string;
  name: string;
  plan: OrgPlan;
  status: 'active' | 'suspended' | 'trial';
  plan_expires_at: string | null;
  horse_count: number;
  member_count: number;
  owner: { id: string; name: string; email: string } | null;
  created_at: string;
  monthly_revenue_ars: number;
}

export function useSuperAdminMetrics() {
  return useQuery<SuperAdminMetrics>({
    queryKey: ['superadmin', 'metrics'],
    queryFn: async () => (await api.get('/superadmin/metrics')).data,
    staleTime: 30_000,
  });
}

export function useSuperAdminOrgs(filters?: { search?: string; plan?: string; status?: string }) {
  return useQuery<SuperAdminOrg[]>({
    queryKey: ['superadmin', 'orgs', filters],
    queryFn: async () => (await api.get('/superadmin/organizations', { params: filters })).data,
  });
}

export function useCreateOrgManually() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; owner_email: string; plan: OrgPlan; months?: number; notes?: string }) =>
      (await api.post('/superadmin/organizations', dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  });
}

export function useSetOrgPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plan, months }: { id: string; plan: OrgPlan; months?: number }) =>
      (await api.patch(`/superadmin/organizations/${id}/plan`, { plan, months })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  });
}

export function useSetOrgStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' | 'trial' }) =>
      (await api.patch(`/superadmin/organizations/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  });
}

export function useDeleteOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/superadmin/organizations/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin'] }),
  });
}
