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
    mutationFn: async (payload: {
      type: string;
      description: string;
      date: string;
      horse_id: string;
      photos?: File[];
    }) => {
      const formData = new FormData();
      formData.append('type', payload.type);
      formData.append('description', payload.description);
      formData.append('date', payload.date);
      formData.append('horse_id', payload.horse_id);

      if (payload.photos) {
        payload.photos.forEach((file) => formData.append('photos', file));
      }

      const { data } = await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', horseId] });
    },
  });
}
