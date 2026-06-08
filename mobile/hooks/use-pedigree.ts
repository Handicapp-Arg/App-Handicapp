import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Pedigree, PedigreeValidation, PedigreeNode } from '../../packages/shared/src';

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
    queryFn: async () => (await api.get(`/horses/${horseId}/pedigree`)).data,
    enabled: !!horseId,
  });
}

export function usePedigreeTree(horseId: string, depth: 2 | 3 = 2) {
  return useQuery<PedigreeNode>({
    queryKey: ['pedigree-tree', horseId, depth],
    queryFn: async () => (await api.get(`/horses/${horseId}/pedigree/tree`, { params: { depth } })).data,
    enabled: !!horseId,
  });
}

export function usePedigreeValidations(horseId: string) {
  return useQuery<PedigreeValidation[]>({
    queryKey: ['pedigree-validations', horseId],
    queryFn: async () => (await api.get(`/horses/${horseId}/pedigree/validations`)).data,
    enabled: !!horseId,
  });
}

export function useUpsertPedigree(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePedigreeDto) =>
      (await api.post(`/horses/${horseId}/pedigree`, dto)).data as Pedigree,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedigree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['pedigree-tree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['horse', horseId] });
    },
  });
}

export function useValidatePedigree(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post(`/horses/${horseId}/pedigree/validate`)).data as { status: string; validations: PedigreeValidation[] },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedigree', horseId] });
      queryClient.invalidateQueries({ queryKey: ['pedigree-validations', horseId] });
      queryClient.invalidateQueries({ queryKey: ['horse', horseId] });
    },
  });
}

export function useSearchHorsesForPedigree(query: string) {
  return useQuery<{ id: string; name: string; registration_number: string | null }[]>({
    queryKey: ['pedigree-search', query],
    queryFn: async () => (await api.get('/pedigree/search', { params: { q: query } })).data,
    enabled: query.length >= 2,
  });
}
