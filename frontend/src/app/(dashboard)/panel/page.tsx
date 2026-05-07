'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAdminUsers, useAdminHorses, useAdminStats, useAdminPlanUsers, useAdminSetPlan, type AdminPlanUser } from '@/hooks/use-admin';
import { useHorses } from '@/hooks/use-horses';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDashboard } from '@/hooks/use-dashboard';
import type { PropietarioDashboard, EstablecimientoDashboard, VeterinarioDashboard } from '@/hooks/use-dashboard';
import {
  SearchInput,
  Pagination,
  StatCard,
  UserTable,
  HorseTable,
} from '@/components/panel';
import { PlanBanner } from '@/components/plan-banner';
import { useBoardingRequests, useAcceptBoardingRequest, useRejectBoardingRequest } from '@/hooks/use-boarding-requests';
import { PageLoader, SkeletonStat } from '@/components/ui/skeleton';

/* ─── tipos ─── */

type Tab = 'propietarios' | 'establecimientos' | 'caballos' | 'planes';

const tabs: { key: Tab; label: string }[] = [
  { key: 'propietarios', label: 'Propietarios' },
  { key: 'establecimientos', label: 'Establecimientos' },
  { key: 'caballos', label: 'Caballos' },
  { key: 'planes', label: 'Planes' },
];

const roleForTab: Record<Tab, string | undefined> = {
  propietarios: 'propietario',
  establecimientos: 'establecimiento',
  caballos: undefined,
  planes: undefined,
};

const typeBadge: Record<string, string> = {
  salud: 'bg-red-50 text-red-700',
  entrenamiento: 'bg-yellow-50 text-yellow-700',
  gasto: 'bg-purple-50 text-purple-700',
  nota: 'bg-gray-100 text-gray-700',
};

const typeLabel: Record<string, string> = {
  salud: 'Salud',
  entrenamiento: 'Entrenamiento',
  gasto: 'Gasto',
  nota: 'Nota',
};

/* ─── Panel Admin ─── */

function AdminPanel() {
  const isMobile = useIsMobile();
  const limit = isMobile ? 5 : 10;

  const [tab, setTab] = useState<Tab>('propietarios');
  const [search, setSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [horsePage, setHorsePage] = useState(1);

  const isHorsesTab = tab === 'caballos';
  const isPlanesTab = tab === 'planes';

  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: usersResult, isLoading: loadingUsers } = useAdminUsers({
    search: (isHorsesTab || isPlanesTab) ? undefined : search,
    role: roleForTab[tab],
    page: userPage,
    limit,
  });
  const { data: horsesResult, isLoading: loadingHorses } = useAdminHorses({
    search: isHorsesTab ? search : undefined,
    page: horsePage,
    limit,
  });
  const { data: planUsers, isLoading: loadingPlans } = useAdminPlanUsers();
  const { data: allHorses } = useHorses();
  const setPlan = useAdminSetPlan();

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSearch('');
    setUserPage(1);
    setHorsePage(1);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setUserPage(1);
    setHorsePage(1);
  };

  const loading = loadingStats || (isPlanesTab ? loadingPlans : isHorsesTab ? loadingHorses : loadingUsers);

  const filteredPlanUsers = planUsers?.filter((u) =>
    search ? u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Propietarios" value={stats?.propietarios ?? 0} />
        <StatCard label="Establecimientos" value={stats?.establecimientos ?? 0} />
        <StatCard label="Caballos" value={stats?.caballos ?? 0} />
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`flex-1 rounded-md px-2 py-2 text-sm font-medium transition cursor-pointer whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!isPlanesTab && (
        <SearchInput value={search} onChange={handleSearch}
          placeholder={isHorsesTab ? 'Buscar por nombre, propietario o establecimiento...' : 'Buscar por nombre o correo...'}
        />
      )}
      {isPlanesTab && (
        <SearchInput value={search} onChange={handleSearch} placeholder="Buscar usuario..." />
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
        </div>
      )}

      {!loading && !isHorsesTab && !isPlanesTab && usersResult?.data && (
        <div className="space-y-3">
          <UserTable
            users={usersResult.data}
            roleLabel={tab === 'propietarios' ? 'Propietarios' : 'Establecimientos'}
            allHorses={allHorses ?? []}
            roleKey={roleForTab[tab] as 'propietario' | 'establecimiento'}
          />
          <Pagination page={usersResult.page} total={usersResult.total} limit={usersResult.limit} onPageChange={setUserPage} />
        </div>
      )}

      {!loading && isHorsesTab && horsesResult?.data && (
        <div className="space-y-3">
          <HorseTable horses={horsesResult.data} />
          <Pagination page={horsesResult.page} total={horsesResult.total} limit={horsesResult.limit} onPageChange={setHorsePage} />
        </div>
      )}

      {!loading && isPlanesTab && (
        <PlansAdminTable
          users={filteredPlanUsers ?? []}
          onSetPlan={(userId, plan, months) => setPlan.mutate({ userId, plan, months })}
          isPending={setPlan.isPending}
        />
      )}
    </div>
  );
}

/* ─── Plans Admin Table ─── */

function PlansAdminTable({
  users,
  onSetPlan,
  isPending,
}: {
  users: AdminPlanUser[];
  onSetPlan: (userId: string, plan: 'free' | 'pro', months?: number) => void;
  isPending: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [months, setMonths] = useState<Record<string, number>>({});

  if (!users.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-400">No hay usuarios para gestionar</p>
      </div>
    );
  }

  const ROLE_LABELS: Record<string, string> = {
    propietario: 'Propietario', establecimiento: 'Establecimiento',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header desktop */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_90px_100px_180px] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Usuario</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Rol</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Plan actual</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Acción</span>
      </div>

      <div className="divide-y divide-gray-50">
        {users.map((u) => {
          const isPro = u.plan === 'pro';
          const expiresStr = u.plan_expires_at
            ? new Date(u.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
            : null;
          const m = months[u.id] ?? 1;

          return (
            <div key={u.id}>
              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_90px_100px_180px] items-center px-4 py-3">
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.horse_count} caballos</p>
                </div>
                <span className="text-sm text-gray-600 truncate pr-2">{u.email}</span>
                <span className="text-xs text-gray-500">{ROLE_LABELS[u.role] ?? u.role}</span>
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isPro ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isPro ? '⭐ Pro' : 'Gratis'}
                  </span>
                  {isPro && expiresStr && <p className="text-[10px] text-gray-400 mt-0.5">vence {expiresStr}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {!isPro ? (
                    <>
                      <select
                        value={m}
                        onChange={(e) => setMonths((prev) => ({ ...prev, [u.id]: Number(e.target.value) }))}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none"
                      >
                        {[1, 3, 6, 12].map((mo) => (
                          <option key={mo} value={mo}>{mo} {mo === 1 ? 'mes' : 'meses'}</option>
                        ))}
                      </select>
                      <button
                        disabled={isPending && pendingId === u.id}
                        onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'pro', m); }}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition cursor-pointer disabled:opacity-50"
                      >
                        {isPending && pendingId === u.id ? '...' : 'Activar Pro'}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={isPending && pendingId === u.id}
                      onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'free'); }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {isPending && pendingId === u.id ? '...' : 'Revocar Pro'}
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[u.role]} · {u.horse_count} caballos</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isPro ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isPro ? '⭐ Pro' : 'Gratis'}
                  </span>
                </div>
                {isPro && expiresStr && <p className="text-xs text-gray-400">Vence: {expiresStr}</p>}
                <div className="flex items-center gap-2">
                  {!isPro ? (
                    <>
                      <select
                        value={m}
                        onChange={(e) => setMonths((prev) => ({ ...prev, [u.id]: Number(e.target.value) }))}
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
                      >
                        {[1, 3, 6, 12].map((mo) => (
                          <option key={mo} value={mo}>{mo} {mo === 1 ? 'mes' : 'meses'}</option>
                        ))}
                      </select>
                      <button
                        disabled={isPending && pendingId === u.id}
                        onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'pro', m); }}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition cursor-pointer disabled:opacity-50"
                      >
                        {isPending && pendingId === u.id ? '...' : 'Activar Pro'}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={isPending && pendingId === u.id}
                      onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'free'); }}
                      className="w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {isPending && pendingId === u.id ? '...' : 'Revocar Pro'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Dashboard Propietario ─── */

function PropietarioDashboardView({ data }: { data: PropietarioDashboard }) {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Mis caballos</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.horses.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Gasto en {monthName}</p>
          <p className="mt-1 text-2xl font-bold text-purple-700">${data.monthly_spend.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Eventos recientes</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.recent_events.length}</p>
        </div>
      </div>

      {/* Caballos */}
      {data.horses.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Mis caballos</h2>
            <Link href="/caballos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.horses.slice(0, 5).map((h) => (
              <Link key={h.id} href={`/caballos/${h.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {h.image_url
                    ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                  {h.establishment && <p className="text-xs text-gray-400 truncate">{h.establishment.name}</p>}
                </div>
                <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Eventos recientes */}
      {data.recent_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${typeBadge[ev.type] ?? typeBadge.nota}`}>
                  {typeLabel[ev.type] ?? ev.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{ev.description}</p>
                  {ev.horse && <p className="text-xs text-gray-400">{ev.horse.name}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Establecimiento ─── */

function BoardingRequestsPanel() {
  const { data: requests } = useBoardingRequests();
  const accept = useAcceptBoardingRequest();
  const reject = useRejectBoardingRequest();

  const pending = requests?.filter((r) => r.status === 'pending') ?? [];
  if (!pending.length) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-100">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold text-amber-900">
          Solicitudes de alojamiento
          <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">{pending.length}</span>
        </h2>
      </div>
      <div className="divide-y divide-amber-100">
        {pending.map((req) => (
          <div key={req.id} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {req.requester?.name} solicita alojar a <span className="text-[#0f1f3d]">{req.horse?.name}</span>
              </p>
              {req.message && (
                <p className="mt-0.5 text-xs text-gray-500 italic">"{req.message}"</p>
              )}
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(req.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => reject.mutate(req.id)}
                disabled={reject.isPending || accept.isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                onClick={() => accept.mutate(req.id)}
                disabled={accept.isPending || reject.isPending}
                className="rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a1628] transition cursor-pointer disabled:opacity-50"
              >
                {accept.isPending ? '...' : 'Aceptar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstablecimientoDashboardView({ data }: { data: EstablecimientoDashboard }) {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Solicitudes de alojamiento */}
      <BoardingRequestsPanel />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Caballos en pensión</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.horses.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Eventos en {monthName}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.monthly_events_count}</p>
        </div>
      </div>

      {/* Caballos en pensión */}
      {data.horses.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Caballos en pensión</h2>
            <Link href="/caballos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.horses.slice(0, 8).map((h) => (
              <Link key={h.id} href={`/caballos/${h.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {h.image_url
                    ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                  {h.owner && <p className="text-xs text-gray-400 truncate">Prop. {h.owner.name}</p>}
                </div>
                <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actividad reciente */}
      {data.recent_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${typeBadge[ev.type] ?? typeBadge.nota}`}>
                  {typeLabel[ev.type] ?? ev.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{ev.description}</p>
                  {ev.horse && <p className="text-xs text-gray-400">{ev.horse.name}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Veterinario ─── */

function VeterinarioDashboardView({ data }: { data: VeterinarioDashboard }) {
  const MED_LABEL: Record<string, string> = {
    vacuna: 'Vacuna', desparasitacion: 'Desparasitación', analisis: 'Análisis', tratamiento: 'Tratamiento',
  };

  if (data.horses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
        <p className="text-3xl mb-3">💉</p>
        <p className="text-sm font-semibold text-gray-600">Sin caballos asignados</p>
        <p className="mt-1 text-xs text-gray-400">Un propietario o establecimiento debe asignarte como veterinario desde el detalle del caballo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mis pacientes</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.total_horses}</p>
        </div>
        <div className="rounded-2xl border border-red-50 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Eventos salud</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{data.total_salud_events}</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${data.upcoming_medical.length > 0 ? 'border-amber-100 bg-amber-50' : 'border-gray-100 bg-white'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${data.upcoming_medical.length > 0 ? 'text-amber-500' : 'text-gray-400'}`}>Vencen pronto</p>
          <p className={`mt-1 text-3xl font-bold ${data.upcoming_medical.length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{data.upcoming_medical.length}</p>
        </div>
      </div>

      {/* Próximos vencimientos médicos */}
      {data.upcoming_medical.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100">
            <h2 className="text-sm font-semibold text-amber-800">⏰ Próximos vencimientos (30 días)</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {data.upcoming_medical.map((m) => {
              const dueDate = new Date(m.next_due + 'T12:00:00');
              const daysUntil = Math.round((dueDate.getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
              const horse = data.horses.find((h) => h.id === m.horse_id);
              return (
                <Link key={m.id} href={`/caballos/${m.horse_id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100/50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-amber-700 bg-white/70 rounded-full px-2 py-0.5">
                        {MED_LABEL[m.type] ?? m.type}
                      </span>
                      <span className="text-sm font-medium text-amber-900">{m.name}</span>
                    </div>
                    {horse && <p className="text-xs text-amber-600 mt-0.5">{horse.name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-700">
                      {daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `en ${daysUntil}d`}
                    </p>
                    <p className="text-[10px] text-amber-500">
                      {dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Caballos asignados */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Mis pacientes</h2>
          <Link href="/caballos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {data.horses.map((h) => (
            <Link key={h.id} href={`/caballos/${h.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {h.image_url
                  ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">{h.name[0]}</div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {h.breed && <span className="text-[10px] text-gray-400">{h.breed.name}</span>}
                  {h.owner && <span className="text-[10px] text-gray-400">· {h.owner.name}</span>}
                </div>
              </div>
              <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Últimos eventos de salud */}
      {data.recent_health_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Últimos registros de salud</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_health_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Salud</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 line-clamp-1">{ev.description}</p>
                  {(ev as any).horse && <p className="text-xs text-gray-400">{(ev as any).horse.name}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function PanelPage() {
  const { user } = useAuth();
  const { data: dashboard, isLoading } = useDashboard();

  const isAdmin = user?.role === 'admin';
  const title = isAdmin ? 'Panel' : 'Inicio';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-[1.375rem] font-extrabold tracking-tight text-gray-900">{title}</h1>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <SkeletonStat key={i} />)}
        </div>
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[1.375rem] font-extrabold tracking-tight text-gray-900">{title}</h1>

      <PlanBanner />

      {isAdmin && <AdminPanel />}

      {dashboard?.role === 'propietario' && (
        <PropietarioDashboardView data={dashboard} />
      )}

      {dashboard?.role === 'establecimiento' && (
        <EstablecimientoDashboardView data={dashboard} />
      )}

      {dashboard?.role === 'veterinario' && (
        <VeterinarioDashboardView data={dashboard} />
      )}
    </div>
  );
}
