'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAdminUsers, useAdminHorses, useAdminStats } from '@/hooks/use-admin';
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

/* ─── tipos ─── */

type Tab = 'propietarios' | 'establecimientos' | 'caballos';

const tabs: { key: Tab; label: string }[] = [
  { key: 'propietarios', label: 'Propietarios' },
  { key: 'establecimientos', label: 'Establecimientos' },
  { key: 'caballos', label: 'Caballos' },
];

const roleForTab: Record<Tab, string | undefined> = {
  propietarios: 'propietario',
  establecimientos: 'establecimiento',
  caballos: undefined,
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

  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: usersResult, isLoading: loadingUsers } = useAdminUsers({
    search: isHorsesTab ? undefined : search,
    role: roleForTab[tab],
    page: userPage,
    limit,
  });
  const { data: horsesResult, isLoading: loadingHorses } = useAdminHorses({
    search: isHorsesTab ? search : undefined,
    page: horsePage,
    limit,
  });
  const { data: allHorses } = useHorses();

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

  const loading = loadingStats || (isHorsesTab ? loadingHorses : loadingUsers);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Propietarios" value={stats?.propietarios ?? 0} />
        <StatCard label="Establecimientos" value={stats?.establecimientos ?? 0} />
        <StatCard label="Caballos" value={stats?.caballos ?? 0} />
      </div>

      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={handleSearch}
        placeholder={isHorsesTab ? 'Buscar por nombre, propietario o establecimiento...' : 'Buscar por nombre o correo...'}
      />

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
        </div>
      )}

      {!loading && !isHorsesTab && usersResult?.data && (
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

function EstablecimientoDashboardView({ data }: { data: EstablecimientoDashboard }) {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
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
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Caballos asignados</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.horses.length}</p>
        </div>
        <div className="rounded-2xl border border-red-50 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Eventos de salud</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{data.total_salud_events}</p>
        </div>
      </div>

      {/* Caballos asignados */}
      {data.horses.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Mis caballos</h2>
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

      {/* Últimos eventos de salud */}
      {data.recent_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Últimos registros de salud</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 shrink-0">Salud</span>
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

      {data.horses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">No tenés caballos asignados todavía.</p>
          <p className="mt-1 text-xs text-gray-400">Un propietario debe asignarte desde el detalle de su caballo.</p>
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
      <div className="flex justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>

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
