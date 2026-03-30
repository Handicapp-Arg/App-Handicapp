import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  horse_count: number;
}

export function useAdminOverview() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/auth/admin/overview');
      return data;
    },
  });
}
