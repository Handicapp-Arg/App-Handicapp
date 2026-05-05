import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Horse } from '../../packages/shared/src';

export function useHorses() {
  return useQuery<Horse[]>({
    queryKey: ['horses'],
    queryFn: async () => (await api.get('/horses')).data,
  });
}

export function useHorse(id: string) {
  return useQuery<Horse>({
    queryKey: ['horses', id],
    queryFn: async () => (await api.get(`/horses/${id}`)).data,
    enabled: !!id,
  });
}

export function useDeleteHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/horses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses'] }),
  });
}
