'use client';

import { useState } from 'react';
import type { Horse } from '@/types';
import { ChevronIcon } from './chevron-icon';

interface HorseTableProps {
  horses: Horse[];
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateFormatterLong = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function HorseTable({ horses }: HorseTableProps) {
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
      {/* Header desktop */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_110px_32px] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
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
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_110px_32px] items-center px-4 py-2.5">
                  <span className="font-medium text-gray-900 truncate pr-2">{h.name}</span>
                  <span className="text-sm text-gray-600 truncate pr-2">{h.owner?.name ?? '-'}</span>
                  <span className="text-sm text-gray-600 truncate pr-2">{h.establishment?.name ?? '-'}</span>
                  <span className="text-xs text-gray-400">{dateFormatter.format(new Date(h.created_at))}</span>
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

              {/* Expanded row */}
              {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
                  {h.birth_date && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-500">Nacimiento: </span>
                      {dateFormatterLong.format(new Date(h.birth_date))}
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
                    Registrado el {dateFormatter.format(new Date(h.created_at))}
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
