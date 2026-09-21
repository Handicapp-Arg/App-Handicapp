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

/**
 * Etiqueta por tipo guardado. Los valores (`alimentacion`, `entrenamiento`,
 * `descanso`, `veterinario`, `otro`) son el enum de la columna en el backend:
 * NO se tocan.
 */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  alimentacion:  'Alimentación',
  entrenamiento: 'Entrenamiento',
  descanso:      'Descanso',
  veterinario:   'Veterinario',
  otro:          'Otro',
};

/**
 * Colores por tipo desde el theme, no hexadecimales fijos: los que había
 * (verde/amarillo/azul claros) quedaban ilegibles en modo oscuro.
 */
export const makeActivityTypeColors = (c: {
  successSoft: string; success: string; goldSoft: string; goldText: string;
  infoSoft: string; info: string; dangerSoft: string; danger: string;
  surfaceAlt: string; textMuted: string;
}): Record<string, { color: string; bg: string }> => ({
  alimentacion:  { color: c.success,   bg: c.successSoft },
  entrenamiento: { color: c.goldText,  bg: c.goldSoft },
  descanso:      { color: c.info,      bg: c.infoSoft },
  veterinario:   { color: c.danger,    bg: c.dangerSoft },
  otro:          { color: c.textMuted, bg: c.surfaceAlt },
});

/**
 * Chips de filtro del álbum: Todas / Trabajo / Salud / Potrero.
 *
 * Son etiquetas de cliente y agrupan valores guardados; el valor que viaja al
 * backend sigue siendo el del enum. "Potrero" junta descanso, alimentación y
 * "otro" para que ninguna foto quede fuera de todos los filtros.
 */
export const PHOTO_FILTERS: { key: string; label: string; tipos: string[] | null }[] = [
  { key: 'todas',   label: 'Todas',   tipos: null },
  { key: 'trabajo', label: 'Trabajo', tipos: ['entrenamiento'] },
  { key: 'salud',   label: 'Salud',   tipos: ['veterinario'] },
  { key: 'potrero', label: 'Potrero', tipos: ['descanso', 'alimentacion', 'otro'] },
];

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
