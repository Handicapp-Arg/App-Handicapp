'use client';

import { useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useFeed, useAdminFeedStats } from '@/hooks/use-feed';
import PostComposer from '@/components/feed/PostComposer';
import PostCard from '@/components/feed/PostCard';
import { Loader2, Rss, BarChart2, EyeOff, Pin, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex items-center gap-3', color)}>
      <div className="opacity-70">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-60 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function MuroPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useFeed(isAdmin ? { include_hidden: true } : {});

  const { data: stats } = useAdminFeedStats();

  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      if (!node) return;
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const posts = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Rss className="h-6 w-6" />
            Muro
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total > 0 ? `${total} publicación${total !== 1 ? 'es' : ''}` : 'La comunidad HandicApp'}
          </p>
        </div>
      </div>

      {/* Admin stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Total"
            value={stats.total}
            color="bg-gray-50 border-gray-200 text-gray-700"
          />
          <StatCard
            icon={<Rss className="h-5 w-5" />}
            label="Hoy"
            value={stats.today}
            color="bg-blue-50 border-blue-100 text-blue-700"
          />
          <StatCard
            icon={<Pin className="h-5 w-5" />}
            label="Fijados"
            value={stats.pinned}
            color="bg-amber-50 border-amber-100 text-amber-700"
          />
          <StatCard
            icon={<EyeOff className="h-5 w-5" />}
            label="Ocultos"
            value={stats.hidden}
            color="bg-red-50 border-red-100 text-red-600"
          />
        </div>
      )}

      {/* Composer */}
      <PostComposer onPosted={() => refetch()} />

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Rss className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Todavía no hay publicaciones</p>
          <p className="text-sm mt-1">¡Sé el primero en compartir algo con la comunidad!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          <div ref={loaderRef} className="flex justify-center py-4">
            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
            {!hasNextPage && posts.length > 5 && (
              <p className="text-xs text-gray-300">Ya viste todo ✓</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
