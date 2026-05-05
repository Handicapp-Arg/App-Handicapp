import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Event } from '../../packages/shared/src';

export function useAllEvents(params?: { type?: string; horse_id?: string; date_from?: string; date_to?: string }) {
  return useQuery<Event[]>({
    queryKey: ['events', 'all', params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set('type', params.type);
      if (params?.horse_id) qs.set('horse_id', params.horse_id);
      if (params?.date_from) qs.set('date_from', params.date_from);
      if (params?.date_to) qs.set('date_to', params.date_to);
      const url = '/events/all' + (qs.toString() ? `?${qs}` : '');
      return (await api.get(url)).data;
    },
  });
}

export function useEventsByHorse(horseId: string) {
  return useQuery<Event[]>({
    queryKey: ['events', horseId],
    queryFn: async () => (await api.get(`/events/horse/${horseId}`)).data,
    enabled: !!horseId,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; description: string; date: string; horse_id: string; amount?: string }) => {
      const { data } = await api.post('/events', payload);
      return data as Event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; type?: string; description?: string; date?: string; amount?: string }) => {
      const { data } = await api.patch(`/events/${id}`, body);
      return data as Event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}
