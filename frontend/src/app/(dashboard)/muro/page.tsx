'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useFeed, useAdminFeedStats } from '@/hooks/use-feed';
import { useHorses } from '@/hooks/use-horses';
import PostComposer from '@/components/feed/PostComposer';
import PostCard from '@/components/feed/PostCard';
import {
  Loader2, Rss, EyeOff, Pin, TrendingUp,
  ChevronRight, Gavel, BookOpen, GitBranch, MapPin, FileText, CalendarDays, Inbox,
} from 'lucide-react';
import { HorseHead } from '@/components/icons/equine';
import { cn } from '@/lib/utils';
import { avatarGradient } from '@/lib/avatar-color';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { Container } from '@/components/ui/container';

// ─── Admin stat card ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3.5', color)}>
      <div className="opacity-60 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs opacity-55 font-medium mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────
function FeedSidebar({ user, stats, isAdmin }: {
  user: { name: string; role: string; avatar_url?: string | null; cover_url?: string | null; avatar_color?: string | null } | null;
  stats?: { total: number; today: number; pinned: number; hidden: number } | null;
  isAdmin: boolean;
}) {
  const { data: horses } = useHorses();
  const role = user?.role ?? '';

  const quickLinks = [
    ...(role === 'propietario' ? [
      { href: '/remates', label: 'Remates', icon: <Gavel className="h-4 w-4" /> },
      { href: '/caballos', label: `Mis caballos${horses?.length ? ` (${horses.length})` : ''}`, icon: <HorseHead size={16} /> },
      { href: '/directorio', label: 'Directorio', icon: <MapPin className="h-4 w-4" /> },
    ] : []),
    ...(role === 'establecimiento' ? [
      { href: '/solicitudes', label: 'Solicitudes', icon: <Inbox className="h-4 w-4" /> },
      { href: '/caballos', label: `Caballos${horses?.length ? ` (${horses.length})` : ''}`, icon: <HorseHead size={16} /> },
      { href: '/contratos', label: 'Contratos', icon: <FileText className="h-4 w-4" /> },
    ] : []),
    ...(role === 'veterinario' ? [
      { href: '/caballos', label: `Pacientes${horses?.length ? ` (${horses.length})` : ''}`, icon: <HorseHead size={16} /> },
      { href: '/agenda', label: 'Agenda', icon: <CalendarDays className="h-4 w-4" /> },
    ] : []),
    { href: '/padron', label: 'Padrón oficial', icon: <BookOpen className="h-4 w-4" /> },
    { href: '/arbol', label: 'Árbol genealógico', icon: <GitBranch className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Profile card — replica el diseño del perfil (cuero) */}
      <div className="overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="relative h-16" style={{ backgroundImage: avatarGradient(user?.name, user?.avatar_color) }}>
          {user?.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="relative z-10 -mt-8 mb-3">
            <Avatar
              name={user?.name}
              avatarUrl={user?.avatar_url}
              avatarColor={user?.avatar_color}
              size="xl"
              shape="rounded"
              ring
            />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-gray-900">{user?.name}</p>
          </div>
          <Link
            href="/perfil"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-clay-50 dark:bg-clay-500/10 py-1.5 text-xs font-semibold text-clay-700 dark:text-clay-300 ring-1 ring-clay-100 dark:ring-clay-500/20 transition hover:bg-clay-100 dark:hover:bg-clay-500/15"
          >
            Ver perfil
          </Link>
        </div>
      </div>

      {/* Admin stats */}
      {isAdmin && stats && (
        <div className="rounded-xl border border-gray-200 bg-[var(--surface-card)] shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Estadísticas</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Total" value={stats.total} color="bg-gray-50 border-gray-100 text-gray-700" />
            <StatCard icon={<Rss className="h-4 w-4" />} label="Hoy" value={stats.today} color="bg-blue-50 border-blue-100 text-blue-700" />
            <StatCard icon={<Pin className="h-4 w-4" />} label="Fijados" value={stats.pinned} color="bg-amber-50 border-amber-100 text-amber-700" />
            <StatCard icon={<EyeOff className="h-4 w-4" />} label="Ocultos" value={stats.hidden} color="bg-red-50 border-red-100 text-red-600" />
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-xl border border-gray-200 bg-[var(--surface-card)] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Accesos rápidos</p>
        </div>
        <div className="divide-y divide-gray-50">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition group"
            >
              <span className="shrink-0 text-gray-400 transition-transform group-hover:scale-110 group-hover:text-clay-600 dark:group-hover:text-clay-300">
                {link.icon}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-700 truncate">{link.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 transition" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MuroPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch,
  } = useFeed(isAdmin ? { include_hidden: true } : {});

  const { data: stats } = useAdminFeedStats();

  const observer = useRef<IntersectionObserver | null>(null);
  const loaderRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      if (!node) return;
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      });
      observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Container width="content" className="space-y-6">

      {/* 2-column layout — el feed queda legible (no se estira a 1600); en pantallas
          grandes respira con más gap y un sidebar algo más ancho */}
      <div className="grid gap-6 xl:gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">

        {/* ── Feed column ── */}
        <div className="min-w-0 space-y-4">
          <PostComposer onPosted={() => refetch()} />

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[var(--surface-card)] rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                    <div className="h-3 bg-gray-100 rounded w-4/6" />
                  </div>
                  <div className="flex gap-4 pt-1">
                    <div className="h-6 bg-gray-100 rounded w-16" />
                    <div className="h-6 bg-gray-100 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Rss}
              title="Todavía no hay publicaciones"
              message="Compartí una novedad, un logro o una foto y empezá la conversación con tu comunidad."
            />
          ) : (
            <>
              <div className="stagger-children space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              <div ref={loaderRef} className="flex justify-center py-6">
                {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
                {!hasNextPage && posts.length > 5 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium">Estás al día</p>
                    <p className="text-xs text-gray-400 mt-0.5">Volvé más tarde para ver nuevas publicaciones.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <FeedSidebar user={user} stats={stats} isAdmin={isAdmin} />
          </div>
        </aside>
      </div>
    </Container>
  );
}
