import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface FinancialSummary {
  total: number;
  average_monthly: number;
  by_type: { type: string; total: number }[];
  monthly: { month: string; total: number }[];
}

export function useFinancialSummary(horseId: string) {
  return useQuery<FinancialSummary>({
    queryKey: ['horses', horseId, 'financial-summary'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/financial-summary`);
      return data;
    },
    enabled: !!horseId,
  });
}
