import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ActivityPhoto {
  id: string;
  horse_id: string;
  url: string;
  activity_type: string;
  caption: string | null;
  taken_at: string;
  photographer?: { id: string; name: string };
  created_at: string;
}

export const ACTIVITY_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  alimentacion:  { label: 'Alimentación',  color: 'text-green-700',  bg: 'bg-green-50' },
  entrenamiento: { label: 'Entrenamiento', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  descanso:      { label: 'Descanso',      color: 'text-blue-700',   bg: 'bg-blue-50' },
  veterinario:   { label: 'Veterinario',   color: 'text-red-700',    bg: 'bg-red-50' },
  otro:          { label: 'Otro',          color: 'text-gray-700',   bg: 'bg-gray-100' },
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
    mutationFn: async ({ file, activity_type, caption }: { file: File; activity_type: string; caption?: string }) => {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('activity_type', activity_type);
      if (caption) fd.append('caption', caption);
      const { data } = await api.post(`/horses/${horseId}/activity-photos`, fd, {
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
    mutationFn: async (id: string) => { await api.delete(`/horses/${horseId}/activity-photos/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity-photos', horseId] }),
  });
}
