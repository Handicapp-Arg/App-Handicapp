'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { FeedPost, FeedComment } from '@/types';

interface FeedPage {
  data: FeedPost[];
  total: number;
  page: number;
  limit: number;
}

interface FeedParams {
  include_hidden?: boolean;
  horse_id?: string;
  author_id?: string;
  limit?: number;
}

export function useFeed(params: FeedParams = {}) {
  return useInfiniteQuery<FeedPage>({
    queryKey: ['feed', params],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/feed', {
        params: { ...params, page: pageParam, limit: params.limit ?? 20 },
      });
      return data;
    },
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
  });
}

export function useFeedPost(id: string) {
  return useQuery<FeedPost>({
    queryKey: ['feed', id],
    queryFn: async () => (await api.get(`/feed/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      horse_id?: string;
      type?: string;
      photos?: File[];
      videos?: File[];
    }) => {
      const form = new FormData();
      form.append('content', payload.content);
      if (payload.horse_id) form.append('horse_id', payload.horse_id);
      if (payload.type) form.append('type', payload.type);
      payload.photos?.forEach((f) => form.append('media', f));
      payload.videos?.forEach((f) => form.append('media', f));
      const { data } = await api.post('/feed', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as FeedPost;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/feed/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await api.post(`/feed/${postId}/like`);
      return data as { liked: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useFeedComments(postId: string) {
  return useQuery<FeedComment[]>({
    queryKey: ['feed-comments', postId],
    queryFn: async () => (await api.get(`/feed/${postId}/comments`)).data,
    enabled: !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/feed/${postId}/comments`, { content });
      return data as FeedComment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-comments', postId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.delete(`/feed/comments/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-comments', postId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/feed/${id}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useToggleHide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/feed/${id}/hide`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useAdminFeedStats() {
  return useQuery<{ total: number; hidden: number; pinned: number; today: number }>({
    queryKey: ['feed-admin-stats'],
    queryFn: async () => (await api.get('/feed/admin/stats')).data,
  });
}
