import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface NotificationSetting {
  id: string;
  role: string;
  event_type: string;
}

export interface EventTypeMeta {
  value: string;
  label: string;
}

export function useEventTypes() {
  return useQuery<EventTypeMeta[]>({
    queryKey: ['event-types'],
    queryFn: async () => {
      const { data } = await api.get('/notification-settings/event-types');
      return data;
    },
    staleTime: Infinity,
  });
}

export function useNotificationSettings() {
  return useQuery<NotificationSetting[]>({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data } = await api.get('/notification-settings');
      return data;
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { role: string; eventTypes: string[] }) => {
      const { data } = await api.put('/notification-settings', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
}
