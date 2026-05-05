import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Event } from '@/types';

interface EventFilters {
  type?: string;
  date_from?: string;
  date_to?: string;
  horse_id?: string;
}

export function useAllEvents(filters?: EventFilters) {
  return useQuery<Event[]>({
    queryKey: ['events', 'all', filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.type) qs.set('type', filters.type);
      if (filters?.date_from) qs.set('date_from', filters.date_from);
      if (filters?.date_to) qs.set('date_to', filters.date_to);
      if (filters?.horse_id) qs.set('horse_id', filters.horse_id);
      qs.set('limit', '200'); // web trae todos de una (paginación solo en mobile)
      const url = '/events/all' + (qs.toString() ? `?${qs}` : '');
      const { data } = await api.get(url);
      return data.data ?? data; // soporta respuesta paginada y plana
    },
  });
}

export function useEventsByHorse(horseId: string) {
  return useQuery<Event[]>({
    queryKey: ['events', horseId],
    queryFn: async () => {
      const { data } = await api.get(`/events/horse/${horseId}`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useCreateBulkEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      type: string;
      description: string;
      date: string;
      horse_ids: string[];
      amount?: string;
    }) => {
      const { data } = await api.post('/events/bulk', payload);
      return data as Event[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useCreateEvent(horseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      type: string;
      description: string;
      date: string;
      horse_id: string;
      amount?: string;
      photos?: File[];
    }) => {
      const formData = new FormData();
      formData.append('type', payload.type);
      formData.append('description', payload.description);
      formData.append('date', payload.date);
      formData.append('horse_id', payload.horse_id);
      if (payload.amount) formData.append('amount', payload.amount);

      if (payload.photos) {
        payload.photos.forEach((file) => formData.append('photos', file));
      }

      const { data } = await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      type?: string;
      description?: string;
      date?: string;
      amount?: string;
    }) => {
      const { data } = await api.patch(`/events/${id}`, payload);
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
