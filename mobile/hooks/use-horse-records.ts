import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface HorseRecordNode {
  id: string | null;
  name: string;
  birth_year: number | null;
  sex: 'macho' | 'hembra' | 'castrado' | null;
  color: string | null;
  country_code: string | null;
  ownership_status: 'unverified' | 'pending_claim' | 'verified' | 'disputed';
  verified_owner: { id: string; name: string } | null;
  sire: HorseRecordNode | null;
  dam: HorseRecordNode | null;
}

export interface HorseRecord {
  id: string;
  name: string;
  birth_year: number | null;
  breed: string | null;
  country_code: string | null;
  sex: 'macho' | 'hembra' | 'castrado' | null;
  color: string | null;
  ownership_status: 'unverified' | 'pending_claim' | 'verified' | 'disputed';
  scrape_status: 'pending' | 'scraping' | 'done' | 'failed' | 'skipped';
  verified_owner?: { id: string; name: string; email: string } | null;
  sire_name: string | null;
  dam_name: string | null;
}

interface SearchResult { items: HorseRecord[]; total: number }

export function useHorseRecordsSearch(name: string, enabled = true) {
  return useQuery<SearchResult>({
    queryKey: ['horse-records', 'search', name],
    queryFn: () => api.get('/horse-records/search', { params: { name, limit: 12 } }).then(r => r.data),
    enabled: enabled && !!name.trim(),
    staleTime: 30_000,
  });
}

export function useHorseRecordTree(id: string | null, depth = 4) {
  return useQuery<HorseRecordNode>({
    queryKey: ['horse-records', id, 'tree', depth],
    queryFn: () => api.get(`/horse-records/${id}/tree`, { params: { depth } }).then(r => r.data),
    enabled: !!id,
    staleTime: 120_000,
  });
}
