'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAdminUsers, useAdminHorses, useAdminStats } from '@/hooks/use-admin';
import { useHorses } from '@/hooks/use-horses';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  SearchInput,
  Pagination,
  StatCard,
  UserTable,
  HorseTable,
} from '@/components/panel';

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

export default function PanelPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const limit = isMobile ? 5 : 10;

  const [tab, setTab] = useState<Tab>('propietarios');
  const [search, setSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [horsePage, setHorsePage] = useState(1);

  const isHorsesTab = tab === 'caballos';

  const { data: stats, isLoading: loadingStats } = useAdminStats();

  const {
    data: usersResult,
    isLoading: loadingUsers,
  } = useAdminUsers({
    search: isHorsesTab ? undefined : search,
    role: roleForTab[tab],
    page: userPage,
    limit,
  });

  const {
    data: horsesResult,
    isLoading: loadingHorses,
  } = useAdminHorses({
    search: isHorsesTab ? search : undefined,
    page: horsePage,
    limit,
  });

  // All horses (unfiltered) for expanded user rows
  const { data: allHorses } = useHorses();

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Solo el admin puede acceder a esta pagina
      </div>
    );
  }

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
      <h1 className="text-xl font-bold text-gray-900">Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Propietarios" value={stats?.propietarios ?? 0} />
        <StatCard label="Establecimientos" value={stats?.establecimientos ?? 0} />
        <StatCard label="Caballos" value={stats?.caballos ?? 0} />
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={handleSearch}
        placeholder={
          isHorsesTab
            ? 'Buscar por nombre, propietario o establecimiento...'
            : 'Buscar por nombre o correo...'
        }
      />

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div
            className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200"
            style={{ borderTopColor: '#0f1f3d' }}
          />
        </div>
      )}

      {/* Users tabs */}
      {!loading && !isHorsesTab && usersResult?.data && (
        <div className="space-y-3">
          <UserTable
            users={usersResult.data}
            roleLabel={tab === 'propietarios' ? 'Propietarios' : 'Establecimientos'}
            allHorses={allHorses ?? []}
            roleKey={roleForTab[tab] as 'propietario' | 'establecimiento'}
          />
          <Pagination
            page={usersResult.page}
            total={usersResult.total}
            limit={usersResult.limit}
            onPageChange={setUserPage}
          />
        </div>
      )}

      {/* Horses tab */}
      {!loading && isHorsesTab && horsesResult?.data && (
        <div className="space-y-3">
          <HorseTable horses={horsesResult.data} />
          <Pagination
            page={horsesResult.page}
            total={horsesResult.total}
            limit={horsesResult.limit}
            onPageChange={setHorsePage}
          />
        </div>
      )}
    </div>
  );
}
