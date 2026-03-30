'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAdminOverview, AdminUser } from '@/hooks/use-admin';
import { useHorses } from '@/hooks/use-horses';
import type { Horse } from '@/types';

type Tab = 'propietarios' | 'establecimientos' | 'caballos';

const tabs: { key: Tab; label: string }[] = [
  { key: 'propietarios', label: 'Propietarios' },
  { key: 'establecimientos', label: 'Establecimientos' },
  { key: 'caballos', label: 'Caballos' },
];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function UserTable({
  users, roleLabel, allHorses, roleKey,
}: {
  users: AdminUser[];
  roleLabel: string;
  allHorses: Horse[];
  roleKey: 'propietario' | 'establecimiento';
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!users.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-400">No hay {roleLabel.toLowerCase()} registrados</p>
      </div>
    );
  }

  const horsesForUser = (userId: string) =>
    allHorses.filter((h) =>
      roleKey === 'propietario' ? h.owner_id === userId : h.establishment_id === userId
    );

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_130px_32px] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Nombre</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400 text-center">Caballos</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Registro</span>
        <span />
      </div>

      <div className="divide-y divide-gray-50">
        {users.map((u) => {
          const open = expandedId === u.id;
          const horses = horsesForUser(u.id);
          return (
            <div key={u.id}>
              {/* Fila principal */}
              <button
                type="button"
                onClick={() => toggle(u.id)}
                className="w-full text-left transition hover:bg-gray-50 cursor-pointer"
              >
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_130px_32px] items-center px-4 py-3">
                  <span className="font-medium text-gray-900 truncate pr-2">{u.name}</span>
                  <span className="text-sm text-gray-600 truncate pr-2">{u.email}</span>
                  <span className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                      {u.horse_count}
                    </span>
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex justify-end"><ChevronIcon open={open} /></span>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                      {u.horse_count} {u.horse_count === 1 ? 'caballo' : 'caballos'}
                    </span>
                    <ChevronIcon open={open} />
                  </div>
                </div>
              </button>

              {/* Fila expandida */}
              {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Caballos vinculados
                  </p>
                  {horses.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin caballos</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {horses.map((h) => (
                        <span
                          key={h.id}
                          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          {h.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Registrado el {new Date(u.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorseTable({ horses }: { horses: Horse[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!horses.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-400">No hay caballos registrados</p>
      </div>
    );
  }

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_130px_32px] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Nombre</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Propietario</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Establecimiento</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Registro</span>
        <span />
      </div>

      <div className="divide-y divide-gray-50">
        {horses.map((h) => {
          const open = expandedId === h.id;
          return (
            <div key={h.id}>
              <button
                type="button"
                onClick={() => toggle(h.id)}
                className="w-full text-left transition hover:bg-gray-50 cursor-pointer"
              >
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_130px_32px] items-center px-4 py-3">
                  <span className="font-medium text-gray-900 truncate pr-2">{h.name}</span>
                  <span className="text-sm text-gray-600 truncate pr-2">{h.owner?.name ?? '-'}</span>
                  <span className="text-sm text-gray-600 truncate pr-2">{h.establishment?.name ?? '-'}</span>
                  <span className="text-sm text-gray-400">
                    {new Date(h.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex justify-end"><ChevronIcon open={open} /></span>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{h.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {h.owner?.name && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          {h.owner.name}
                        </span>
                      )}
                      {h.establishment?.name && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {h.establishment.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronIcon open={open} />
                </div>
              </button>

              {/* Fila expandida */}
              {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
                  {h.birth_date && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-500">Fecha de nacimiento: </span>
                      {new Date(h.birth_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-500">Propietario: </span>
                    {h.owner?.name ?? '-'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-500">Establecimiento: </span>
                    {h.establishment?.name ?? '-'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Registrado el {new Date(h.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PanelPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('propietarios');
  const { data: users, isLoading: loadingUsers } = useAdminOverview();
  const { data: horses, isLoading: loadingHorses } = useHorses();

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Solo el admin puede acceder a esta pagina
      </div>
    );
  }

  if (loadingUsers || loadingHorses) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
      </div>
    );
  }

  const propietarios = users?.filter((u) => u.role === 'propietario') ?? [];
  const establecimientos = users?.filter((u) => u.role === 'establecimiento') ?? [];
  const allHorses = horses ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Panel</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Propietarios" value={propietarios.length} />
        <StatCard label="Establecimientos" value={establecimientos.length} />
        <StatCard label="Caballos" value={allHorses.length} />
      </div>

      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'propietarios' && (
        <UserTable users={propietarios} roleLabel="Propietarios" allHorses={allHorses} roleKey="propietario" />
      )}
      {tab === 'establecimientos' && (
        <UserTable users={establecimientos} roleLabel="Establecimientos" allHorses={allHorses} roleKey="establecimiento" />
      )}
      {tab === 'caballos' && (
        <HorseTable horses={allHorses} />
      )}
    </div>
  );
}
