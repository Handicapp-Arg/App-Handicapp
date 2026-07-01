import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface ReportSummary {
  horses: { total: number };
  health: { total: number; rojo: number; amarillo: number };
  expenses: {
    month_total: number;
    year_total: number;
    by_category: { category: string; total: number }[];
    monthly: { month: string; total: number }[];
  };
  upcoming: {
    appointments: {
      id: string;
      horse_id: string;
      horse_name: string;
      type: string;
      title: string;
      scheduled_at: string;
    }[];
    medical: {
      id: string;
      horse_id: string;
      horse_name: string;
      name: string;
      type: string;
      next_due: string;
    }[];
  };
}

export function useReportSummary() {
  return useQuery<ReportSummary>({
    queryKey: ['report-summary'],
    queryFn: async () => (await api.get('/reports/summary')).data,
    staleTime: 60_000,
    retry: false,
  });
}
