import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface BoardingRequest {
  id: string;
  horse_id: string;
  establishment_id: string;
  requester_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  horse?: { id: string; name: string; image_url: string | null };
  establishment?: { id: string; name: string };
  requester?: { id: string; name: string; email: string };
}

export function useBoardingRequests() {
  return useQuery<BoardingRequest[]>({
    queryKey: ['boarding-requests'],
    queryFn: async () => (await api.get('/boarding-requests')).data,
  });
}

export function useCreateBoardingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { horse_id: string; establishment_id: string; message?: string }) =>
      (await api.post('/boarding-requests', dto)).data as BoardingRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boarding-requests'] }),
  });
}

export function useAcceptBoardingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/boarding-requests/${id}/accept`)).data as BoardingRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boarding-requests'] });
      qc.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useRejectBoardingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/boarding-requests/${id}/reject`)).data as BoardingRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boarding-requests'] }),
  });
}