import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CatalogItem } from '@/types';

export function useBreeds() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog-items', 'breed'],
    queryFn: async () => {
      const { data } = await api.get('/catalog-items?type=breed');
      return data;
    },
  });
}

export function useActivities() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog-items', 'activity'],
    queryFn: async () => {
      const { data } = await api.get('/catalog-items?type=activity');
      return data;
    },
  });
}

export function useCreateCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { type: string; name: string }) => {
      const { data } = await api.post('/catalog-items', dto);
      return data;
    },
    onSuccess: (_data, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items', type] });
    },
  });
}

export function useDeleteCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
    },
  });
}
