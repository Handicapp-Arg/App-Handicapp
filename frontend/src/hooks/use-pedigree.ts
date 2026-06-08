import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Pedigree, PedigreeValidation, PedigreeDocument, PedigreeNode, DocumentType } from '@/types';

export interface CreatePedigreeDto {
  sire_id?: string;
  dam_id?: string;
  sire_name?: string;
  dam_name?: string;
  sire_registration_number?: string;
  dam_registration_number?: string;
  paternal_grandsire_name?: string;
  paternal_granddam_name?: string;
  maternal_grandsire_name?: string;
  maternal_granddam_name?: string;
}

export function usePedigree(horseId: string) {
  return useQuery<Pedigree | null>({
    queryKey: ['pedigree', horseId],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/pedigree`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function usePedigreeTree(horseId: string, depth: 2 | 3 = 2) {
  return useQuery<PedigreeNode>({
    queryKey: ['pedigree-tree', horseId, depth],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/pedigree/tree`, { params: { depth } });
      return data;
    },
    enabled: !!horseId,
  });
}

export function usePedigreeValidations(horseId: string) {
  return useQuery<PedigreeValidation[]>({
    queryKey: ['pedigree-validations', horseId],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/pedigree/validations`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useUpsertPedigree(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePedigreeDto) => {
      const { data } = await api.post(`/horses/${horseId}/pedigree`, dto);
      return data as Pedigree;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedigree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['pedigree-tree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useValidatePedigree(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/horses/${horseId}/pedigree/validate`);
      return data as { status: string; validations: PedigreeValidation[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedigree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['pedigree-validations', horseId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useUploadPedigreeDocument(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { type: DocumentType; file_url: string; file_name: string }) => {
      const { data } = await api.post(`/horses/${horseId}/pedigree/documents`, dto);
      return data as PedigreeDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedigree', horseId] });
    },
  });
}

export function useAdminResolvePedigree(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { resolution: 'validated' | 'disputed'; notes?: string }) => {
      const { data } = await api.post(`/horses/${horseId}/pedigree/resolve`, dto);
      return data as Pedigree;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedigree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useSearchHorsesForPedigree(query: string) {
  return useQuery<{ id: string; name: string; registration_number: string | null }[]>({
    queryKey: ['pedigree-search', query],
    queryFn: async () => {
      const { data } = await api.get('/pedigree/search', { params: { q: query } });
      return data;
    },
    enabled: query.length >= 2,
  });
}

export function useAdminPedigreeStats() {
  return useQuery<{ total: number; verified: number; pending: number; disputed: number }>({
    queryKey: ['pedigree-admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/pedigree/admin/stats');
      return data;
    },
  });
}

export function useDisputedPedigrees() {
  return useQuery<Pedigree[]>({
    queryKey: ['pedigree-disputed'],
    queryFn: async () => {
      const { data } = await api.get('/pedigree/admin/disputed');
      return data;
    },
  });
}
