import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { getErrorMessage } from '@/lib/errors';

export interface Contract {
  id: string;
  establishment_id: string;
  owner_id: string;
  horse_id: string | null;
  title: string;
  body: string;
  status: 'pending' | 'signed' | 'rejected';
  // Firma del propietario (owner)
  signed_name: string | null;
  signed_at: string | null;
  owner_signature_url: string | null;
  // Firma del establecimiento
  establishment_signed_name: string | null;
  establishment_signed_at: string | null;
  establishment_signature_url: string | null;
  body_hash: string | null;
  rejection_reason: string | null;
  created_at: string;
  establishment?: { id: string; name: string };
  owner?: { id: string; name: string };
  horse?: { id: string; name: string } | null;
}

export function useContracts() {
  return useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => (await api.get('/contracts')).data,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (dto: { owner_id: string; horse_id?: string; title: string; body: string }) =>
      (await api.post('/contracts', dto)).data as Contract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato creado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSignContract() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, signature, signed_name }: { id: string; signature: File; signed_name: string }) => {
      const fd = new FormData();
      fd.append('signature', signature);
      fd.append('signed_name', signed_name);
      const { data } = await api.post(`/contracts/${id}/sign`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as Contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato firmado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRejectContract() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/contracts/${id}/reject`, { reason })).data as Contract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato rechazado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/contracts/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato eliminado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
