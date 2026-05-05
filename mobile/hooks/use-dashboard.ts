import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Horse, Event } from '../../packages/shared/src';

export interface DashboardData {
  role: 'admin' | 'propietario' | 'establecimiento' | 'veterinario';
  horses?: Horse[];
  recent_events?: Event[];
  monthly_spend?: number;
  monthly_events_count?: number;
  stats?: { propietarios: number; establecimientos: number; caballos: number };
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });
}
