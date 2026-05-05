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

export function useCreateHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; birth_date?: string; establishment_id?: string; microchip?: string }) => {
      const { data } = await api.post('/horses', dto);
      return data as Horse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses'] }),
  });
}

export function useDeleteHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/horses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses'] }),
  });
}

export function useFinancialSummary(horseId: string) {
  return useQuery<{ total: number; average_monthly: number; monthly: { month: string; total: number }[] }>({
    queryKey: ['horses', horseId, 'financial-summary'],
    queryFn: async () => (await api.get(`/horses/${horseId}/financial-summary`)).data,
    enabled: !!horseId,
  });
}
