import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Event } from '@/types';

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

export function useCreateEvent(horseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      type: string;
      description: string;
      date: string;
      horse_id: string;
    }) => {
      const { data } = await api.post('/events', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', horseId] });
    },
  });
}
