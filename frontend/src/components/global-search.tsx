'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { avatarGradient, initialsOf } from '@/lib/avatar-color';

interface SearchResult {
  horses: Array<{ id: string; name: string; breed: string | null; activity: string | null; image_url: string | null }>;
  events: Array<{ id: string; horse_id: string; type: string; description: string; date: string }>;
  medical: Array<{ id: string; horse_id: string; type: string; name: string; date: string; next_due: string | null }>;
}

const TYPE_BADGE: Record<string, string> = {
  salud: 'bg-red-50 dark:bg-red-500/10 text-red-600', entrenamiento: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700',
  gasto: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700', nota: 'bg-gray-100 text-gray-600',
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ['search', query],
    queryFn: async () => (await api.get(`/search?q=${encodeURIComponent(query)}`)).data,
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });

  const hasResults = data && (data.horses.length + data.events.length + data.medical.length) > 0;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-white/25 transition">
        <svg className="h-3.5 w-3.5 shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar caballos, eventos..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-xs text-white placeholder-white/30 focus:outline-none min-w-0"
        />
        {isFetching && <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white/70 shrink-0" />}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="animate-scale-in absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-200 bg-[var(--surface-card)] shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {!hasResults && !isFetching && (
            <p className="px-4 py-6 text-center text-xs text-gray-400">Sin resultados para "{query}"</p>
          )}

          {data?.horses && data.horses.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">Caballos</p>
              {data.horses.map((h) => (
                <button key={h.id} onClick={() => navigate(`/caballos/${h.id}`)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left cursor-pointer border-b border-gray-50 last:border-0"
                >
                  <div style={{ backgroundImage: avatarGradient(h.name) }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white">
                    {initialsOf(h.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{h.name}</p>
                    {(h.breed || h.activity) && (
                      <p className="text-xs text-gray-400 truncate">{[h.breed, h.activity].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {data?.events && data.events.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">Eventos</p>
              {data.events.map((e) => (
                <button key={e.id} onClick={() => navigate(`/caballos/${e.horse_id}`)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition text-left cursor-pointer border-b border-gray-50 last:border-0"
                >
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[e.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.type}
                  </span>
                  <p className="flex-1 text-xs text-gray-700 truncate">{e.description}</p>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                </button>
              ))}
            </div>
          )}

          {data?.medical && data.medical.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">Historial médico</p>
              {data.medical.map((m) => (
                <button key={m.id} onClick={() => navigate(`/caballos/${m.horse_id}`)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition text-left cursor-pointer border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm">💊</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.name}</p>
                    {m.next_due && (
                      <p className="text-[10px] text-amber-600">Próx: {new Date(m.next_due + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {new Date(m.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
