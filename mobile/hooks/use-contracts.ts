import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useLookupUserByEmail(email: string) {
  return useQuery<{ id: string; name: string; role: string } | null>({
    queryKey: ['user-lookup', email],
    queryFn: async () => {
      if (!email || email.length < 5) return null;
      const res = await api.get('/auth/users/lookup', { params: { email } });
      return res.data ?? null;
    },
    enabled: email.includes('@') && email.length >= 5,
    staleTime: 30_000,
    retry: false,
  });
}

export interface Contract {
  id: string;
  establishment_id: string;
  owner_id: string;
  horse_id: string | null;
  title: string;
  body: string;
  status: 'pending' | 'signed' | 'rejected';
  signed_name: string | null;
  signed_at: string | null;
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
  return useMutation({
    mutationFn: async (dto: { owner_id: string; horse_id?: string; title: string; body: string }) =>
      (await api.post('/contracts', dto)).data as Contract,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useSignContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, signed_name }: { id: string; signed_name: string }) =>
      (await api.post(`/contracts/${id}/sign`, { signed_name })).data as Contract,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useRejectContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/contracts/${id}/reject`, { reason })).data as Contract,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/contracts/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}
