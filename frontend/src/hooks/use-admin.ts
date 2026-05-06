import { useQuery, useMutation, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Horse } from '@/types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  horse_count: number;
  plan?: string;
  plan_expires_at?: string | null;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface AdminQueryParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export function useAdminUsers(params: AdminQueryParams = {}) {
  const { search, role, page = 1, limit = 10 } = params;

  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: ['admin', 'users', { search, role, page, limit }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (role) qs.set('role', role);
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      const { data } = await api.get(`/auth/admin/overview?${qs}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminHorses(params: AdminQueryParams = {}) {
  const { search, page = 1, limit = 10 } = params;

  return useQuery<PaginatedResponse<Horse>>({
    queryKey: ['admin', 'horses', { search, page, limit }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      const { data } = await api.get(`/auth/admin/horses?${qs}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminStats() {
  return useQuery<{ propietarios: number; establecimientos: number; caballos: number }>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/auth/admin/stats');
      return data;
    },
  });
}

export function useAdminPlanUsers() {
  return useQuery<AdminPlanUser[]>({
    queryKey: ['admin', 'plan-users'],
    queryFn: async () => (await api.get('/plans/admin/users')).data,
  });
}

export function useAdminSetPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, plan, months }: { userId: string; plan: 'free' | 'pro'; months?: number }) =>
      (await api.patch(`/plans/admin/${userId}`, { plan, months })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plan-users'] });
    },
  });
}
