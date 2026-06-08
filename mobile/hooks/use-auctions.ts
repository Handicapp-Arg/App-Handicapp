import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Auction, AuctionBid } from '../../packages/shared/src/types';

interface AuctionsQuery {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export function useAuctions(params: AuctionsQuery = {}) {
  return useQuery<{ data: Auction[]; total: number; page: number; limit: number }>({
    queryKey: ['auctions', params],
    queryFn: async () => (await api.get('/auctions', { params })).data,
  });
}

export function useAuction(id: string) {
  return useQuery<Auction>({
    queryKey: ['auctions', id],
    queryFn: async () => (await api.get(`/auctions/${id}`)).data,
    enabled: !!id,
  });
}

export function useAuctionBids(id: string) {
  return useQuery<AuctionBid[]>({
    queryKey: ['auctions', id, 'bids'],
    queryFn: async () => (await api.get(`/auctions/${id}/bids`)).data,
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export function useMyAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'me', 'selling'],
    queryFn: async () => (await api.get('/auctions/me/selling')).data,
  });
}

export function usePlaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, amount, notes }: { auctionId: string; amount: number; notes?: string }) => {
      const { data } = await api.post(`/auctions/${auctionId}/bids`, { amount, notes });
      return data as AuctionBid;
    },
    onSuccess: (_, { auctionId }) => {
      qc.invalidateQueries({ queryKey: ['auctions', auctionId] });
      qc.invalidateQueries({ queryKey: ['auctions', auctionId, 'bids'] });
    },
  });
}

export function usePublishAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/auctions/${id}/publish`)).data as Auction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}

export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/auctions/${id}/watch`)).data as { watching: boolean },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['auctions', id] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

export interface CreateAuctionPayload {
  horse_id: string;
  type: 'venta_directa' | 'remate';
  title: string;
  description?: string;
  asking_price?: number;
  starting_bid?: number;
  bid_increment?: number;
  currency: 'ARS' | 'USD';
  auction_end?: string;
  location?: string;
  has_health_cert?: boolean;
  has_ownership_docs?: boolean;
}

export function useCreateAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAuctionPayload) =>
      (await api.post('/auctions', payload)).data as Auction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}
