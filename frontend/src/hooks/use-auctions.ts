'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Auction, AuctionBid } from '@/types';

interface AuctionsQuery {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}

interface AuctionsList {
  data: Auction[];
  total: number;
  page: number;
  limit: number;
}

export function useAuctions(params: AuctionsQuery = {}) {
  return useQuery<AuctionsList>({
    queryKey: ['auctions', params],
    queryFn: async () => {
      const { data } = await api.get('/auctions', { params });
      return data;
    },
  });
}

export function useAuction(id: string) {
  return useQuery<Auction>({
    queryKey: ['auctions', id],
    queryFn: async () => {
      const { data } = await api.get(`/auctions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAuctionBids(id: string) {
  return useQuery<AuctionBid[]>({
    queryKey: ['auctions', id, 'bids'],
    queryFn: async () => {
      const { data } = await api.get(`/auctions/${id}/bids`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export function useMyAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'me', 'selling'],
    queryFn: async () => {
      const { data } = await api.get('/auctions/me/selling');
      return data;
    },
  });
}

export function useMyWatchedAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'me', 'watching'],
    queryFn: async () => {
      const { data } = await api.get('/auctions/me/watching');
      return data;
    },
  });
}

export function useCreateAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Auction>) => {
      const { data } = await api.post('/auctions', dto);
      return data as Auction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });
}

export function usePublishAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/auctions/${id}/publish`);
      return data as Auction;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['auctions'] });
      qc.invalidateQueries({ queryKey: ['auctions', id] });
    },
  });
}

export function usePauseAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/auctions/${id}/pause`);
      return data as Auction;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['auctions'] });
      qc.invalidateQueries({ queryKey: ['auctions', id] });
    },
  });
}

export function useCancelAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/auctions/${id}/cancel`);
      return data as Auction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
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

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, bidId }: { auctionId: string; bidId: string }) => {
      const { data } = await api.patch(`/auctions/${auctionId}/bids/${bidId}/accept`);
      return data as Auction;
    },
    onSuccess: (_, { auctionId }) => {
      qc.invalidateQueries({ queryKey: ['auctions', auctionId] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      const { data } = await api.post(`/auctions/${auctionId}/watch`);
      return data as { watching: boolean };
    },
    onSuccess: (_, auctionId) => {
      qc.invalidateQueries({ queryKey: ['auctions', auctionId] });
      qc.invalidateQueries({ queryKey: ['auctions', 'me', 'watching'] });
    },
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────

export function useAdminAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'admin', 'all'],
    queryFn: async () => (await api.get('/auctions/admin/all')).data,
  });
}

export function useAdminCancelAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/auctions/${id}/cancel`);
      return data as Auction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auctions', 'admin', 'all'] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

export function useAdminPauseAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/auctions/${id}/pause`);
      return data as Auction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auctions', 'admin', 'all'] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}
