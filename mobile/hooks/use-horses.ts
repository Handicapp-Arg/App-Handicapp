import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Horse } from '../../packages/shared/src';

export function useHorses() {
  return useQuery<Horse[]>({
    queryKey: ['horses'],
    queryFn: async () => (await api.get('/horses')).data,
  });
}

export function useHorse(id: string) {
  return useQuery<Horse>({
    queryKey: ['horses', id],
    queryFn: async () => (await api.get(`/horses/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; birth_date?: string; establishment_id?: string; microchip?: string }) => {
      const { data } = await api.post('/horses', dto);
      return data as Horse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses'] }),
  });
}

export function useUpdateHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string; name?: string; birth_date?: string | null; microchip?: string | null }) => {
      const { data } = await api.patch(`/horses/${id}`, dto);
      return data as Horse;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['horses'] });
      qc.invalidateQueries({ queryKey: ['horses', id] });
    },
  });
}

export function useDeleteHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/horses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses'] }),
  });
}

export function useUploadHorseImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, uri }: { id: string; uri: string }) => {
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: 'horse.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      const { data } = await api.post(`/horses/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as Horse;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['horses'] });
      qc.invalidateQueries({ queryKey: ['horses', id] });
    },
  });
}

export interface HorseDocument {
  id: string;
  name: string;
  url: string;
  file_type: 'pdf' | 'image';
  created_at: string;
}

export function useHorseDocuments(horseId: string) {
  return useQuery<HorseDocument[]>({
    queryKey: ['horses', horseId, 'documents'],
    queryFn: async () => (await api.get(`/horses/${horseId}/documents`)).data,
    enabled: !!horseId,
  });
}

export function useFinancialSummary(horseId: string) {
  return useQuery<{ total: number; average_monthly: number; monthly: { month: string; total: number }[] }>({
    queryKey: ['horses', horseId, 'financial-summary'],
    queryFn: async () => (await api.get(`/horses/${horseId}/financial-summary`)).data,
    enabled: !!horseId,
  });
}

export interface WeightRecord {
  id: string;
  weight_kg: number;
  body_condition: number | null;
  date: string;
  notes: string | null;
  recorder?: { id: string; name: string };
}

export function useWeightRecords(horseId: string) {
  return useQuery<WeightRecord[]>({
    queryKey: ['horses', horseId, 'weight'],
    queryFn: async () => (await api.get(`/horses/${horseId}/weight`)).data,
    enabled: !!horseId,
  });
}

export function useAddWeightRecord(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { weight_kg: string; body_condition?: number; date: string; notes?: string }) => {
      const { data } = await api.post(`/horses/${horseId}/weight`, dto);
      return data as WeightRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses', horseId, 'weight'] }),
  });
}

export function useDeleteWeightRecord(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => api.delete(`/horses/${horseId}/weight/${recordId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses', horseId, 'weight'] }),
  });
}

/* ─── Veterinarios ─── */

export function useVeterinarios() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['veterinarios'],
    queryFn: async () => (await api.get('/auth/users?role=veterinario')).data,
  });
}

export function useHorseVets(horseId: string) {
  return useQuery<{ id: string; user_id: string; user: { id: string; name: string; email: string } }[]>({
    queryKey: ['horses', horseId, 'vets'],
    queryFn: async () => (await api.get(`/horses/${horseId}/vets`)).data,
    enabled: !!horseId,
  });
}

export function useAssignVet(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) => api.post(`/horses/${horseId}/vets`, { user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses', horseId, 'vets'] }),
  });
}

export function useRemoveVet(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vetUserId: string) => api.delete(`/horses/${horseId}/vets/${vetUserId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses', horseId, 'vets'] }),
  });
}

/* ─── Transferencia ─── */

export function usePropietarios() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['propietarios'],
    queryFn: async () => (await api.get('/auth/users?role=propietario')).data,
  });
}

export function useTransferHorse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, new_owner_id }: { id: string; new_owner_id: string }) =>
      api.post(`/horses/${id}/transfer`, { new_owner_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses'] }),
  });
}

/* ─── Historial de movimientos ─── */

export interface HorseMovement {
  id: string;
  type: string;
  description: string;
  actor: { id: string; name: string; role: string } | null;
  created_at: string;
}

export function useHorseMovements(horseId: string) {
  return useQuery<HorseMovement[]>({
    queryKey: ['horses', horseId, 'movements'],
    queryFn: async () => (await api.get(`/horses/${horseId}/movements`)).data,
    enabled: !!horseId,
  });
}

/* ─── Documentos ─── */

export function useUploadDocument(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, name }: { uri: string; name: string }) => {
      const formData = new FormData();
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'pdf';
      const mime = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
      formData.append('file', { uri, name: `${name}.${ext}`, type: mime } as unknown as Blob);
      formData.append('name', name);
      const { data } = await api.post(`/horses/${horseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as HorseDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses', horseId, 'documents'] }),
  });
}

export function useDeleteDocument(horseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/horses/${horseId}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horses', horseId, 'documents'] }),
  });
}
