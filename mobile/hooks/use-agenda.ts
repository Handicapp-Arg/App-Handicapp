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
  /** Quién atiende (texto libre). Los turnos viejos lo traen en null. */
  professional?: string | null;
  /** Horas de anticipación del aviso. null o 0 = no avisar. */
  remind_hours_before?: number | null;
  completed: boolean;
}

/** Cuerpo que aceptan el alta y la edición (la edición, todo opcional). */
export type AppointmentInput = {
  horse_id: string;
  type: string;
  title: string;
  scheduled_at: string;
  notes?: string | null;
  professional?: string | null;
  remind_hours_before?: number | null;
};

export const APPOINTMENT_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  veterinario:    { label: 'Veterinario',     color: '#b91c1c', bg: '#fef2f2' },
  herrador:       { label: 'Herrador',        color: '#92400e', bg: '#fffbeb' },
  competencia:    { label: 'Competencia',     color: '#1d4ed8', bg: '#eff6ff' },
  desparasitacion:{ label: 'Desparasitación', color: '#15803d', bg: '#f0fdf4' },
  vacuna:         { label: 'Vacuna',          color: '#6d28d9', bg: '#f5f3ff' },
  entrenamiento:  { label: 'Entrenamiento',   color: '#a16207', bg: '#fefce8' },
  otro:           { label: 'Otro',            color: '#374151', bg: '#f3f4f6' },
};

/**
 * Opciones de aviso previo. `horas: null` es "no avisar" explícito: el backend
 * lo guarda como NULL y el cron lo saltea. Vive acá, al lado del tipo, para que
 * el alta y la edición ofrezcan exactamente las mismas opciones.
 */
export const AVISOS: { label: string; horas: number | null }[] = [
  { label: '1 hora antes', horas: 1 },
  { label: '3 horas antes', horas: 3 },
  { label: 'El día anterior', horas: 24 },
  { label: 'No avisar', horas: null },
];

/** Default del backend: si el turno no trae nada, avisa el día anterior. */
export const AVISO_DEFAULT = 24;

export function useAgenda(upcoming?: boolean) {
  return useQuery<ServiceAppointment[]>({
    queryKey: ['agenda', { upcoming }],
    queryFn: async () => (await api.get(upcoming ? '/agenda?upcoming=true' : '/agenda')).data,
  });
}

/**
 * Un turno suelto. La pantalla de edición se abre desde la lista, así que el
 * dato casi siempre ya está en caché: se pasa como `initialData` para que el
 * formulario aparezca lleno de entrada y el fetch solo confirme.
 */
export function useAppointment(id?: string) {
  const qc = useQueryClient();
  return useQuery<ServiceAppointment>({
    queryKey: ['agenda', 'turno', id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/agenda/${id}`)).data,
    initialData: () => {
      if (!id) return undefined;
      for (const [, lista] of qc.getQueriesData<ServiceAppointment[]>({ queryKey: ['agenda'] })) {
        const encontrado = Array.isArray(lista) ? lista.find((a) => a?.id === id) : undefined;
        if (encontrado) return encontrado;
      }
      return undefined;
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AppointmentInput) => {
      const { data } = await api.post('/agenda', dto);
      return data as ServiceAppointment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<AppointmentInput> & { id: string }) => {
      const { data } = await api.patch(`/agenda/${id}`, dto);
      return data as ServiceAppointment;
    },
    // Invalidar el prefijo alcanza: tumba las listas (`['agenda', {upcoming}]`)
    // y también el turno suelto (`['agenda', 'turno', id]`).
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
