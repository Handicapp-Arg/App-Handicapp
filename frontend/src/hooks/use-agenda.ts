import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ServiceAppointment {
  id: string;
  horse_id: string;
  horse?: { id: string; name: string };
  type: string;
  title: string;
  scheduled_at: string;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  veterinario:    { label: 'Veterinario',    color: 'text-red-700',    bg: 'bg-red-50' },
  herrador:       { label: 'Herrador',       color: 'text-amber-700',  bg: 'bg-amber-50' },
  competencia:    { label: 'Competencia',    color: 'text-blue-700',   bg: 'bg-blue-50' },
  desparasitacion:{ label: 'Desparasitación',color: 'text-green-700',  bg: 'bg-green-50' },
  vacuna:         { label: 'Vacuna',         color: 'text-purple-700', bg: 'bg-purple-50' },
  entrenamiento:  { label: 'Entrenamiento',  color: 'text-yellow-700', bg: 'bg-yellow-50' },
  otro:           { label: 'Otro',           color: 'text-gray-700',   bg: 'bg-gray-100' },
};

export { TYPE_LABELS as APPOINTMENT_TYPES };

export function useAgenda(upcoming?: boolean) {
  return useQuery<ServiceAppointment[]>({
    queryKey: ['agenda', { upcoming }],
    queryFn: async () => {
      const url = upcoming ? '/agenda?upcoming=true' : '/agenda';
      return (await api.get(url)).data;
    },
  });
}

export function useAgendaByHorse(horseId: string) {
  return useQuery<ServiceAppointment[]>({
    queryKey: ['agenda', 'horse', horseId],
    queryFn: async () => (await api.get(`/agenda/horse/${horseId}`)).data,
    enabled: !!horseId,
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
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/agenda/${id}/complete`);
      return data as ServiceAppointment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/agenda/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}
