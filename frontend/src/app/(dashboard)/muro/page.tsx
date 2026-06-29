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
  ChevronRight, Trophy, BookOpen, GitBranch, Users, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { avatarGradient, initialsOf } from '@/lib/avatar-color';

const ROLE_LABELS: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
};

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
  const initials = initialsOf(user?.name);
  const role = user?.role ?? '';

  const quickLinks = [
    ...(role === 'propietario' ? [
      { href: '/remates', label: 'Remates', icon: <Trophy className="h-4 w-4" />, color: 'text-violet-600' },
      { href: '/caballos', label: `Mis caballos${horses?.length ? ` (${horses.length})` : ''}`, icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>, color: 'text-blue-600' },
      { href: '/directorio', label: 'Directorio', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>, color: 'text-emerald-600' },
    ] : []),
    ...(role === 'establecimiento' ? [
      { href: '/solicitudes', label: 'Solicitudes', icon: <Inbox className="h-4 w-4" />, color: 'text-orange-500' },
      { href: '/caballos', label: `Caballos${horses?.length ? ` (${horses.length})` : ''}`, icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>, color: 'text-blue-600' },
      { href: '/contratos', label: 'Contratos', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>, color: 'text-emerald-600' },
    ] : []),
    ...(role === 'veterinario' ? [
      { href: '/caballos', label: `Pacientes${horses?.length ? ` (${horses.length})` : ''}`, icon: <Users className="h-4 w-4" />, color: 'text-violet-600' },
      { href: '/agenda', label: 'Agenda', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>, color: 'text-blue-600' },
    ] : []),
    { href: '/padron', label: 'Padrón oficial', icon: <BookOpen className="h-4 w-4" />, color: 'text-slate-600' },
    { href: '/arbol', label: 'Árbol genealógico', icon: <GitBranch className="h-4 w-4" />, color: 'text-emerald-600' },
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
            <div className="h-16 w-16 overflow-hidden rounded-2xl ring-4 ring-[var(--surface-card)]" style={{ backgroundImage: avatarGradient(user?.name, user?.avatar_color) }}>
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">{initials}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-gray-900">{user?.name}</p>
            <p className="mt-0.5 text-xs text-gray-400">{ROLE_LABELS[role] ?? role}</p>
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
              <span className={cn('shrink-0 transition-transform group-hover:scale-110', link.color)}>
                {link.icon}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-700 truncate">{link.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 transition" />
            </Link>
          ))}
        </div>
      </div>

      {/* HandicApp brand */}
      <div className="rounded-2xl bg-gradient-to-br from-clay-500 to-clay-700 p-4 text-center space-y-1 shadow-[var(--shadow-card)]">
        <p className="text-xs font-bold text-white/90">HandicApp</p>
        <p className="text-[11px] text-white/55 leading-relaxed">La plataforma de gestión equina de Argentina</p>
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
    <div className="space-y-6">

      {/* 2-column layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">

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
            <div className="text-center py-20 bg-[var(--surface-card)] rounded-xl border border-gray-200 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                <Rss className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-600">Todavía no hay publicaciones</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">¡Sé el primero en compartir algo con la comunidad!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              <div ref={loaderRef} className="flex justify-center py-6">
                {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
                {!hasNextPage && posts.length > 5 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-300 font-medium">Ya viste todo</p>
                    <p className="text-xs text-gray-200 mt-0.5">Volvé más tarde para ver nuevas publicaciones</p>
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
    </div>
  );
}
