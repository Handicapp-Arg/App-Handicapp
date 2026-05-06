import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Horse, Event } from '@/types';

export interface AdminDashboard {
  role: 'admin';
  stats: { propietarios: number; establecimientos: number; caballos: number };
  recent_events: Event[];
}

export interface PropietarioDashboard {
  role: 'propietario';
  horses: Horse[];
  recent_events: Event[];
  monthly_spend: number;
}

export interface EstablecimientoDashboard {
  role: 'establecimiento';
  horses: Horse[];
  recent_events: Event[];
  monthly_events_count: number;
}

export interface MedicalDue {
  id: string;
  horse_id: string;
  type: string;
  name: string;
  date: string;
  next_due: string;
}

export interface VeterinarioDashboard {
  role: 'veterinario';
  total_horses: number;
  total_salud_events: number;
  horses: import('@/types').Horse[];
  recent_health_events: import('@/types').Event[];
  upcoming_medical: MedicalDue[];
}

export type DashboardData = AdminDashboard | PropietarioDashboard | EstablecimientoDashboard | VeterinarioDashboard;

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data;
    },
  });
}
