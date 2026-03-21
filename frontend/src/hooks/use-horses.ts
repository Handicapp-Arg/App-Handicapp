import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Horse } from '@/types';

export function useHorses() {
  return useQuery<Horse[]>({
    queryKey: ['horses'],
    queryFn: async () => {
      const { data } = await api.get('/horses');
      return data;
    },
  });
}

export function useHorse(id: string) {
  return useQuery<Horse>({
    queryKey: ['horses', id],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateHorse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      name: string;
      birth_date?: string;
      owner_id?: string;
    }) => {
      const { data } = await api.post('/horses', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}
