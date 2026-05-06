import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ServiceAppointment {
  id: string;
  horse_id: string;
  horse?: { id: string; name: string };
  type: string;
  title: string;
  scheduled_at: string;
  notes: string | null;
  completed: boolean;
}

export const APPOINTMENT_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  veterinario:    { label: 'Veterinario',     color: '#b91c1c', bg: '#fef2f2' },
  herrador:       { label: 'Herrador',        color: '#92400e', bg: '#fffbeb' },
  competencia:    { label: 'Competencia',     color: '#1d4ed8', bg: '#eff6ff' },
  desparasitacion:{ label: 'Desparasitación', color: '#15803d', bg: '#f0fdf4' },
  vacuna:         { label: 'Vacuna',          color: '#6d28d9', bg: '#f5f3ff' },
  entrenamiento:  { label: 'Entrenamiento',   color: '#a16207', bg: '#fefce8' },
  otro:           { label: 'Otro',            color: '#374151', bg: '#f3f4f6' },
};

export function useAgenda(upcoming?: boolean) {
  return useQuery<ServiceAppointment[]>({
    queryKey: ['agenda', { upcoming }],
    queryFn: async () => (await api.get(upcoming ? '/agenda?upcoming=true' : '/agenda')).data,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { horse_id: string; type: string; title: string; scheduled_at: string; notes?: string }) => {
      const { data } = await api.post('/agenda', dto);
      return data as ServiceAppointment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useCompleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/agenda/${id}/complete`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/agenda/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}
