import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  user: { id: string; name: string; role: string };
  text: string;
  created_at: string;
}

export function useEventComments(eventId: string, enabled = false) {
  return useQuery<EventComment[]>({
    queryKey: ['event-comments', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/events/${eventId}/comments`);
      return data;
    },
    enabled: !!eventId && enabled,
  });
}

export function useAddEventComment(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/events/${eventId}/comments`, { text });
      return data as EventComment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] }),
  });
}

export function useDeleteEventComment(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/events/comments/${commentId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] }),
  });
}
