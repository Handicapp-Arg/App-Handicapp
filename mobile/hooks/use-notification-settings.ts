import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

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
    queryFn: async () => (await api.get('/notification-settings/event-types')).data,
    staleTime: Infinity,
  });
}

export function useNotificationSettings() {
  return useQuery<NotificationSetting[]>({
    queryKey: ['notification-settings'],
    queryFn: async () => (await api.get('/notification-settings')).data,
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { role: string; eventTypes: string[] }) =>
      (await api.put('/notification-settings', dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-settings'] }),
  });
}
