import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Horse, HorseOwnership, HorseRecord } from '@/types';
import { useToast } from '@/lib/toast-context';
import { getErrorMessage } from '@/lib/errors';

export interface CreateHorseResult {
  horse: Horse;
  record_matches: HorseRecord[];
}

export function useEstablishments() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['establishments'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users?role=establecimiento');
      return data;
    },
  });
}

export function useHorses() {
  return useQuery<Horse[]>({
    queryKey: ['horses'],
    queryFn: async () => {
      const { data } = await api.get('/horses');
      return data;
    },
  });
}

export function useHorse(id: string) {
  return useQuery<Horse>({
    queryKey: ['horses', id],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateHorse() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (dto: {
      name: string;
      birth_date?: string;
      owner_id?: string;
      establishment_id?: string;
      microchip?: string;
      breed_id?: string;
      activity_id?: string;
      sex?: string;
      color?: string;
    }) => {
      const { data } = await api.post('/horses', dto);
      return data as CreateHorseResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      toast.success('Caballo agregado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateHorse() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      name?: string;
      birth_date?: string | null;
      establishment_id?: string | null;
      microchip?: string | null;
      breed_id?: string | null;
      activity_id?: string | null;
    }) => {
      const { data } = await api.patch(`/horses/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      toast.success('Caballo guardado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

function optimisticImageUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  horseId: string,
  imageUrl: string | null,
) {
  const prev = queryClient.getQueryData<Horse[]>(['horses']);
  if (prev) {
    queryClient.setQueryData<Horse[]>(
      ['horses'],
      prev.map((h) => (h.id === horseId ? { ...h, image_url: imageUrl } : h)),
    );
  }
  return prev;
}

export function useUploadHorseImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post(`/horses/${id}/image`, formData);
      return data;
    },
    onMutate: async ({ id, file }) => {
      await queryClient.cancelQueries({ queryKey: ['horses'] });
      const prev = optimisticImageUpdate(queryClient, id, URL.createObjectURL(file));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['horses'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useRemoveHorseImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/horses/${id}/image`);
      return data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['horses'] });
      const prev = optimisticImageUpdate(queryClient, id, null);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['horses'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function usePropietarios() {
  return useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ['propietarios'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users?role=propietario');
      return data;
    },
  });
}

export function useVeterinarios() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['veterinarios'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users?role=veterinario');
      return data;
    },
  });
}

export function useHorseVets(horseId: string) {
  return useQuery<{ id: string; user_id: string; user: { id: string; name: string; email: string } }[]>({
    queryKey: ['horses', horseId, 'vets'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/vets`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useAssignVet(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data } = await api.post(`/horses/${horseId}/vets`, { user_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'vets'] });
    },
  });
}

export function useRemoveVet(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vetUserId: string) => {
      await api.delete(`/horses/${horseId}/vets/${vetUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'vets'] });
    },
  });
}

/* ─── Equipo asignado (jinete / peón / encargado) ─── */

export function useHorseAssignees(horseId: string) {
  return useQuery<{ id: string; user_id: string; role: string; user: { id: string; name: string; email: string } }[]>({
    queryKey: ['horses', horseId, 'assignees'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/assignees`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useHorseOrgMembers(horseId: string, enabled = true) {
  return useQuery<{ user_id: string; name: string; email: string; role_in_org: string }[]>({
    queryKey: ['horses', horseId, 'org-members'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/org-members`);
      return data;
    },
    enabled: !!horseId && enabled,
  });
}

export function useAssignMember(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data } = await api.post(`/horses/${horseId}/assignees`, { user_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'assignees'] });
    },
  });
}

export function useRemoveMember(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberUserId: string) => {
      await api.delete(`/horses/${horseId}/assignees/${memberUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'assignees'] });
    },
  });
}

export function useHorseOwnership(horseId: string | null) {
  return useQuery<HorseOwnership[]>({
    queryKey: ['horses', horseId, 'ownership'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/ownership`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useUpdateOwnership() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      horseId,
      owners,
    }: {
      horseId: string;
      owners: { user_id: string; percentage: number }[];
    }) => {
      const { data } = await api.put(`/horses/${horseId}/ownership`, {
        owners,
      });
      return data;
    },
    onSuccess: (_data, { horseId }) => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      queryClient.invalidateQueries({
        queryKey: ['horses', horseId, 'ownership'],
      });
      toast.success('Titularidad actualizada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteHorse() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/horses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      toast.success('Caballo eliminado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export interface HorseDocument {
  id: string;
  horse_id: string;
  name: string;
  url: string;
  file_type: 'pdf' | 'image';
  created_at: string;
}

export interface WeightRecord {
  id: string;
  horse_id: string;
  weight_kg: number;
  body_condition: number | null;
  date: string;
  notes: string | null;
  recorder?: { id: string; name: string };
  created_at: string;
}

export function useWeightRecords(horseId: string) {
  return useQuery<WeightRecord[]>({
    queryKey: ['horses', horseId, 'weight'],
    queryFn: async () => (await api.get(`/horses/${horseId}/weight`)).data,
    enabled: !!horseId,
  });
}

export function useAddWeightRecord(horseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (dto: { weight_kg: string; body_condition?: number; date: string; notes?: string }) => {
      const { data } = await api.post(`/horses/${horseId}/weight`, dto);
      return data as WeightRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'weight'] });
      toast.success('Peso registrado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteWeightRecord(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      await api.delete(`/horses/${horseId}/weight/${recordId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'weight'] }),
  });
}

export function useHorseDocuments(horseId: string) {
  return useQuery<HorseDocument[]>({
    queryKey: ['horses', horseId, 'documents'],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/documents`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useUploadDocument(horseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      const { data } = await api.post(`/horses/${horseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as HorseDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'documents'] });
      toast.success('Documento subido');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteDocument(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/horses/${horseId}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses', horseId, 'documents'] });
    },
  });
}

export function useTransferHorse() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, new_owner_id }: { id: string; new_owner_id: string }) => {
      const { data } = await api.post(`/horses/${id}/transfer`, { new_owner_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      toast.success('Caballo transferido');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export interface HorseMovement {
  id: string;
  horse_id: string;
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

