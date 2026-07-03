import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
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
  // Firma del PROPIETARIO
  signed_name: string | null;
  signed_at: string | null;
  owner_signature_url: string | null;
  // Firma del ESTABLECIMIENTO
  establishment_signed_name: string | null;
  establishment_signed_at: string | null;
  establishment_signature_url: string | null;
  // Huella anti-adulteración del cuerpo
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
  return useMutation({
    mutationFn: async (dto: { owner_id: string; horse_id?: string; title: string; body: string }) =>
      (await api.post('/contracts', dto)).data as Contract,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useSignContract() {
  const queryClient = useQueryClient();
  return useMutation({
    // `signature` es el dataURL PNG (base64) que devuelve el pad de firma.
    mutationFn: async ({ id, signature, signed_name }: { id: string; signature: string; signed_name: string }) => {
      // El upload multipart necesita un archivo con URI: escribimos el base64 del
      // dataURL a un archivo temporal y mandamos esa uri como { uri, name, type }.
      const base64 = signature.replace(/^data:image\/\w+;base64,/, '');
      const uri = `${FileSystem.cacheDirectory}firma-${id}-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

      const formData = new FormData();
      formData.append('signature', { uri, name: 'firma.png', type: 'image/png' } as unknown as Blob);
      formData.append('signed_name', signed_name);
      const { data } = await api.post(`/contracts/${id}/sign`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as Contract;
    },
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
