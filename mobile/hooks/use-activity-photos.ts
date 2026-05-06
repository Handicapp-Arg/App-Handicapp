import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ActivityPhoto {
  id: string;
  url: string;
  activity_type: string;
  caption: string | null;
  taken_at: string;
  photographer?: { id: string; name: string };
}

export const ACTIVITY_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  alimentacion:  { label: 'Alimentación',  color: '#15803d', bg: '#f0fdf4' },
  entrenamiento: { label: 'Entrenamiento', color: '#a16207', bg: '#fefce8' },
  descanso:      { label: 'Descanso',      color: '#1d4ed8', bg: '#eff6ff' },
  veterinario:   { label: 'Veterinario',   color: '#b91c1c', bg: '#fef2f2' },
  otro:          { label: 'Otro',          color: '#374151', bg: '#f3f4f6' },
};

export function useActivityPhotos(horseId: string) {
  return useQuery<ActivityPhoto[]>({
    queryKey: ['activity-photos', horseId],
    queryFn: async () => (await api.get(`/horses/${horseId}/activity-photos`)).data,
    enabled: !!horseId,
  });
}

export function useUploadActivityPhoto(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, activity_type, caption }: { uri: string; activity_type: string; caption?: string }) => {
      const formData = new FormData();
      formData.append('photo', { uri, name: 'activity.jpg', type: 'image/jpeg' } as unknown as Blob);
      formData.append('activity_type', activity_type);
      if (caption) formData.append('caption', caption);
      const { data } = await api.post(`/horses/${horseId}/activity-photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as ActivityPhoto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-photos', horseId] }),
  });
}

export function useDeleteActivityPhoto(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/horses/${horseId}/activity-photos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-photos', horseId] }),
  });
}
