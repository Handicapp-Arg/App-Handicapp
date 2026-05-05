import { useState, useCallback } from 'react';
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
  const [hasMore, setHasMore] = useState(true);

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

  // Acumular páginas cuando llegan
  const prevData = query.data;
  if (prevData) {
    const ids = new Set(allItems.map((e) => e.id));
    const newItems = prevData.data.filter((e) => !ids.has(e.id));
    if (newItems.length > 0) {
      setAllItems((prev) => [...prev, ...newItems]);
      setHasMore(allItems.length + newItems.length < prevData.total);
    }
  }

  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) setPage((p) => p + 1);
  }, [query.isFetching, hasMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllItems([]);
    setHasMore(true);
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
