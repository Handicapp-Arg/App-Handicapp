'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface DirectorioItem {
  id: string;
  name: string;
  horse_count: number;
}

function useDirectorio(search: string) {
  return useQuery<DirectorioItem[]>({
    queryKey: ['directorio', search],
    queryFn: async () => {
      const url = search ? `/auth/directorio?search=${encodeURIComponent(search)}` : '/auth/directorio';
      return (await api.get(url)).data;
    },
  });
}

export default function DirectorioPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data: items, isLoading } = useDirectorio(debouncedSearch);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__directorioTimer);
    (window as any).__directorioTimer = setTimeout(() => setDebouncedSearch(v), 400);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Directorio de establecimientos</h1>
        <p className="mt-1 text-sm text-gray-400">Encontrá establecimientos disponibles en HandicApp.</p>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
        </div>
      ) : !items?.length ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay establecimientos registrados todavía.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: '#0f1f3d' }}>
                  <span className="text-lg font-bold text-white">{item.name[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {item.horse_count} {item.horse_count === 1 ? 'caballo en pensión' : 'caballos en pensión'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  Activo en HandicApp
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
