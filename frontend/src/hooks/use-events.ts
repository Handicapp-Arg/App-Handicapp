import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Event } from '@/types';
import { useToast } from '@/lib/toast-context';
import { getErrorMessage } from '@/lib/errors';

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
  const toast = useToast();

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${data.length} eventos creados`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateEvent(horseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload: {
      type: string;
      description: string;
      date: string;
      horse_id: string;
      amount?: string;
      expense_category?: string;
      is_public?: boolean;
      event_time?: string;
      recurrence_type?: string;
      recurrence_end?: string;
      photos?: File[];
    }) => {
      const formData = new FormData();
      formData.append('type', payload.type);
      formData.append('description', payload.description);
      formData.append('date', payload.date);
      formData.append('horse_id', payload.horse_id);
      if (payload.amount) formData.append('amount', payload.amount);
      if (payload.expense_category) formData.append('expense_category', payload.expense_category);
      if (payload.is_public !== undefined) formData.append('is_public', String(payload.is_public));
      if (payload.event_time) formData.append('event_time', payload.event_time);
      if (payload.recurrence_type) formData.append('recurrence_type', payload.recurrence_type);
      if (payload.recurrence_end) formData.append('recurrence_end', payload.recurrence_end);

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
      toast.success('Evento creado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
      expense_category?: string;
      currency?: 'ARS' | 'USD';
      is_public?: boolean;
    }) => {
      const { data } = await api.patch(`/events/${id}`, payload);
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento actualizado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento eliminado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export interface TrainingMetrics {
  id: string;
  event_id: string;
  distance_km: number | null;
  duration_min: number | null;
  intensity: number | null;
  discipline: string | null;
}

export function useTrainingMetrics(eventId: string) {
  return useQuery<TrainingMetrics | null>({
    queryKey: ['events', eventId, 'training-metrics'],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/events/${eventId}/training-metrics`);
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!eventId,
  });
}

export function useUpsertTrainingMetrics(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { distance_km?: number; duration_min?: number; intensity?: number; discipline?: string }) => {
      const { data } = await api.post(`/events/${eventId}/training-metrics`, dto);
      return data as TrainingMetrics;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', eventId, 'training-metrics'] }),
  });
}

export function useShareEvent() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post(`/events/${eventId}/share`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Compartido en el muro');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
