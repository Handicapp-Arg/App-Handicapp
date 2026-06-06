import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Event } from '../../packages/shared/src';

const PAGE_SIZE = 20;

interface EventsPage {
  data: Event[];
  total: number;
  page: number;
  limit: number;
}

export function useAllEvents(params?: { type?: string; horse_id?: string }) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Event[]>([]);

  const buildUrl = (p: number) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.horse_id) qs.set('horse_id', params.horse_id);
    qs.set('page', String(p));
    qs.set('limit', String(PAGE_SIZE));
    return '/events/all?' + qs.toString();
  };

  const query = useQuery<EventsPage>({
    queryKey: ['events', 'all', params, page],
    queryFn: async () => {
      const { data } = await api.get(buildUrl(page));
      return data;
    },
    staleTime: 15_000,
  });

  // Acumular páginas en un efecto para no llamar setState durante el render
  useEffect(() => {
    if (!query.data) return;
    setAllItems((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newItems = query.data!.data.filter((e) => !existingIds.has(e.id));
      return newItems.length > 0 ? [...prev, ...newItems] : prev;
    });
  }, [query.data]);

  const hasMore = query.data ? allItems.length < query.data.total : true;

  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) setPage((p) => p + 1);
  }, [query.isFetching, hasMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllItems([]);
  }, []);

  return {
    events: allItems,
    isLoading: query.isLoading && allItems.length === 0,
    isFetchingMore: query.isFetching && allItems.length > 0,
    hasMore,
    loadMore,
    reset,
    refetch: () => { reset(); query.refetch(); },
    total: query.data?.total ?? 0,
  };
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
    mutationFn: async (payload: {
      type: string; description: string; date: string; horse_id: string;
      amount?: string; currency?: string; photoUris?: string[];
    }) => {
      const { photoUris, ...fields } = payload;
      if (photoUris && photoUris.length > 0) {
        const formData = new FormData();
        Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) formData.append(k, v as string); });
        photoUris.forEach((uri, i) => {
          const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          formData.append('photos', { uri, name: `photo_${i}.${ext}`, type: mime } as unknown as Blob);
        });
        const { data } = await api.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data as Event;
      }
      const { data } = await api.post('/events', fields);
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
