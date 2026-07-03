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
  registration_source: string | null;
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

/**
 * Búsqueda en vivo en el Stud Book Argentino oficial.
 * Consulta el registro oficial (~1-2s), importa los ejemplares encontrados
 * y los devuelve como registros normales del padrón (mismo shape que /search).
 * Se dispara de forma explícita (mutación) por su costo/latencia.
 */
export function useSearchLiveStudbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string): Promise<SearchResult> =>
      api.get('/horse-records/search-live', { params: { name } }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horse-records', 'search'] });
    },
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

export interface SubmitClaimPayload {
  horse_record_id: string;
  horse_id?: string;
  microchip?: string;
  claimed_birth_date?: string;
  registration_number?: string;
  document_url?: string;
  document_public_id?: string;
}

export function useUploadClaimDocument() {
  return useMutation({
    mutationFn: async (uri: string): Promise<{ url: string; public_id: string }> => {
      const formData = new FormData();
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
      formData.append('file', { uri, name: `doc.${ext}`, type: mime } as unknown as Blob);
      const { data } = await api.post('/horse-records/claims/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { url: string; public_id: string };
    },
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitClaimPayload) =>
      api.post('/horse-records/claims', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horse-records'] });
    },
  });
}
