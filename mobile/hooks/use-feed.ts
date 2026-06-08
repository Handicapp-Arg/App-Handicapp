import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { FeedPost, FeedComment } from '../../packages/shared/src/types';

const PAGE_SIZE = 20;

interface FeedPage {
  data: FeedPost[];
  total: number;
  page: number;
  limit: number;
}

export function useFeedPosts(params?: { horse_id?: string; include_hidden?: boolean; author_id?: string }) {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const query = useQuery<FeedPage>({
    queryKey: ['feed', params, page],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (params?.horse_id) qs.set('horse_id', params.horse_id);
      if (params?.include_hidden) qs.set('include_hidden', 'true');
      if (params?.author_id) qs.set('author_id', params.author_id);
      const { data } = await api.get(`/feed?${qs}`);
      return data;
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!query.data) return;
    if (page === 1) {
      setPosts(query.data.data);
    } else {
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const fresh = query.data!.data.filter((p) => !ids.has(p.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    }
  }, [query.data, page]);

  const hasMore = query.data ? posts.length < query.data.total : true;

  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) setPage((p) => p + 1);
  }, [query.isFetching, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setPosts([]);
    query.refetch();
  }, [query]);

  return {
    posts,
    isLoading: query.isLoading && posts.length === 0,
    isFetchingMore: query.isFetching && posts.length > 0,
    isRefreshing: query.isFetching && page === 1 && posts.length > 0,
    hasMore,
    loadMore,
    refresh,
    total: query.data?.total ?? 0,
  };
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      horse_id?: string;
      type?: string;
      photoUris?: string[];
      videoUris?: string[];
    }) => {
      const { photoUris, videoUris, ...fields } = payload;
      const hasMedia = (photoUris?.length ?? 0) + (videoUris?.length ?? 0) > 0;

      if (hasMedia) {
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => { if (v) form.append(k, v as string); });
        photoUris?.forEach((uri, i) => {
          const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          form.append('media', { uri, name: `photo_${i}.${ext}`, type: mime } as unknown as Blob);
        });
        videoUris?.forEach((uri, i) => {
          const ext = uri.split('.').pop()?.toLowerCase() ?? 'mp4';
          const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
          form.append('media', { uri, name: `video_${i}.${ext}`, type: mime } as unknown as Blob);
        });
        const { data } = await api.post('/feed', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data as FeedPost;
      }

      const { data } = await api.post('/feed', fields);
      return data as FeedPost;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await api.post(`/feed/${postId}/like`);
      return { postId, liked: data.liked as boolean };
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
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
