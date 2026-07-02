import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface DailyRoutine {
  id: string;
  date: string;
  morning_feed: boolean;
  afternoon_feed: boolean;
  evening_feed: boolean;
  water_ok: boolean;
  paddock: boolean;
  trained: boolean;
  health_check: boolean;
  box_cleaned: boolean;
  groomed: boolean;
  observations: string | null;
}

/** Alias corto usado por el Modo Peón. */
export type Routine = DailyRoutine;

export const ROUTINE_ITEMS = [
  { key: 'morning_feed',   label: 'Comida mañana', emoji: '🌅' },
  { key: 'afternoon_feed', label: 'Comida tarde',  emoji: '☀️' },
  { key: 'evening_feed',   label: 'Comida noche',  emoji: '🌙' },
  { key: 'water_ok',       label: 'Agua',          emoji: '💧' },
  { key: 'paddock',        label: 'Paddock',        emoji: '🌿' },
  { key: 'trained',        label: 'Entrenamiento', emoji: '🏃' },
  { key: 'health_check',   label: 'Salud',         emoji: '❤️' },
] as const;

export function useRoutines(horseId: string) {
  return useQuery<DailyRoutine[]>({
    queryKey: ['routines', horseId],
    queryFn: async () => (await api.get(`/horses/${horseId}/routines?limit=7`)).data,
    enabled: !!horseId,
  });
}

/**
 * Rutina de UN día concreto (`YYYY-MM-DD`). Usada por el Modo Peón para saber
 * qué tareas ya se hicieron hoy. Reutiliza el listado de rutinas recientes.
 */
export function useRoutine(horseId: string, date: string) {
  return useQuery<DailyRoutine | null>({
    queryKey: ['routines', horseId, date],
    queryFn: async () => {
      const { data } = await api.get<DailyRoutine[]>(`/horses/${horseId}/routines?limit=7`);
      return data.find((r) => r.date?.slice(0, 10) === date) ?? null;
    },
    enabled: !!horseId && !!date,
  });
}

export function useUpsertRoutine(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<DailyRoutine> & { date: string }) => {
      const { data } = await api.post(`/horses/${horseId}/routines`, dto);
      return data as DailyRoutine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines', horseId] }),
  });
}

/** Fecha de hoy en formato `YYYY-MM-DD` (hora local). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
