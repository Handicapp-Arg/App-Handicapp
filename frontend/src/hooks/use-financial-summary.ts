import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface RecentExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  expense_category: string | null;
}

export interface FinancialSummary {
  total: number;
  average_monthly: number;
  by_category: { category: string; total: number }[];
  monthly: { month: string; total: number }[];
  recent_expenses: RecentExpense[];
}

export function useFinancialSummary(horseId: string, enabled = true) {
  return useQuery<FinancialSummary>({
    queryKey: ['horses', horseId, 'financial-summary'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/financial-summary`);
      return data;
    },
    enabled: !!horseId && enabled,
  });
}
