import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Horse } from '@/types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
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
