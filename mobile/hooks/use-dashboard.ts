import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Horse, Event } from '../../packages/shared/src';

interface MedicalUpcoming {
  id: string;
  type: string;
  name: string;
  next_due: string;
  horse_id: string;
}

export interface DashboardData {
  role: 'admin' | 'propietario' | 'establecimiento' | 'veterinario';
  horses?: Horse[];
  recent_events?: Event[];
  monthly_spend?: number;
  monthly_events_count?: number;
  spend_by_horse?: { horse_id: string; horse_name: string; total: number }[];
  spend_by_category?: { category: string; total: number }[];
  recent_expenses?: Event[];
  stats?: { propietarios: number; establecimientos: number; caballos: number };
  // Veterinario
  total_horses?: number;
  total_salud_events?: number;
  recent_health_events?: Event[];
  upcoming_medical?: MedicalUpcoming[];
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });
}

/** Un ítem del feed de supervisión del encargado (capataz). */
export interface EncargadoFeedItem {
  kind: 'rutina' | 'foto' | 'entrenamiento' | 'aviso';
  horse_id: string;
  horse_name: string;
  author_name: string | null;
  at: string;
  title: string;
  detail: string | null;
  photo_url: string | null;
  is_alert: boolean;
}

/** Panel de supervisión del encargado: `GET /dashboard` cuando el rol es encargado. */
export interface EncargadoDashboard {
  horses_total: number;
  activity_today: number;
  alerts_count: number;
  feed: EncargadoFeedItem[];
}

export function useEncargadoDashboard() {
  return useQuery<EncargadoDashboard>({
    queryKey: ['dashboard', 'encargado'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });
}
