'use client';

import { useState } from 'react';
import type { AdminUser } from '@/hooks/use-admin';
import type { Horse } from '@/types';
import { ChevronIcon } from './chevron-icon';

interface UserTableProps {
  users: AdminUser[];
  roleLabel: string;
  allHorses: Horse[];
  roleKey: 'propietario' | 'establecimiento';
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function UserTable({ users, roleLabel, allHorses, roleKey }: UserTableProps) {
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
      roleKey === 'propietario' ? h.owner_id === userId : h.establishment_id === userId,
    );

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header desktop */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_72px_110px_32px] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
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
              <button
                type="button"
                onClick={() => toggle(u.id)}
                className="w-full text-left transition hover:bg-gray-50 cursor-pointer"
              >
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_72px_110px_32px] items-center px-4 py-2.5">
                  <span className="font-medium text-gray-900 truncate pr-2">{u.name}</span>
                  <span className="text-sm text-gray-600 truncate pr-2">{u.email}</span>
                  <span className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {u.horse_count}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">{dateFormatter.format(new Date(u.created_at))}</span>
                  <span className="flex justify-end"><ChevronIcon open={open} /></span>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {u.horse_count}
                    </span>
                    <ChevronIcon open={open} />
                  </div>
                </div>
              </button>

              {/* Expanded row */}
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
                    Registrado el {dateFormatter.format(new Date(u.created_at))}
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
