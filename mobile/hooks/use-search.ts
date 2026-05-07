import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface SearchResults {
  horses: { id: string; name: string; breed: string | null; activity: string | null }[];
  events: { id: string; horse_id: string; type: string; description: string; date: string }[];
  medical: { id: string; horse_id: string; type: string; name: string; date: string }[];
}

export function useSearch(query: string) {
  return useQuery<SearchResults>({
    queryKey: ['search', query],
    queryFn: async () => {
      if (query.trim().length < 2) return { horses: [], events: [], medical: [] };
      const res = await api.get('/search', { params: { q: query.trim() } });
      return res.data;
    },
    enabled: query.trim().length >= 2,
    staleTime: 15_000,
  });
}
