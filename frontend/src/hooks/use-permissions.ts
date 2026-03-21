import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Permission {
  id: string;
  role: string;
  resource: string;
  action: string;
}

export function usePermissions() {
  return useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await api.get('/permissions');
      return data;
    },
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      role: string;
      permissions: { resource: string; action: string }[];
    }) => {
      const { data } = await api.put('/permissions', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}
