import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Horse } from '@/types';

export function useEstablishments() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['establishments'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users?role=establecimiento');
      return data;
    },
  });
}

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
      establishment_id?: string;
    }) => {
      const { data } = await api.post('/horses', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useUpdateHorse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      name?: string;
      birth_date?: string | null;
      establishment_id?: string | null;
    }) => {
      const { data } = await api.patch(`/horses/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

function optimisticImageUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  horseId: string,
  imageUrl: string | null,
) {
  const prev = queryClient.getQueryData<Horse[]>(['horses']);
  if (prev) {
    queryClient.setQueryData<Horse[]>(
      ['horses'],
      prev.map((h) => (h.id === horseId ? { ...h, image_url: imageUrl } : h)),
    );
  }
  return prev;
}

export function useUploadHorseImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post(`/horses/${id}/image`, formData);
      return data;
    },
    onMutate: async ({ id, file }) => {
      await queryClient.cancelQueries({ queryKey: ['horses'] });
      const prev = optimisticImageUpdate(queryClient, id, URL.createObjectURL(file));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['horses'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useRemoveHorseImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/horses/${id}/image`);
      return data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['horses'] });
      const prev = optimisticImageUpdate(queryClient, id, null);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['horses'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useDeleteHorse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/horses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}
