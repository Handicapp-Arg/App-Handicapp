'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHorses } from '@/hooks/use-horses';
import { useAuth } from '@/lib/auth-context';
import { useCreateBoardingRequest, useBoardingRequests } from '@/hooks/use-boarding-requests';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Building2, Search as SearchIcon } from 'lucide-react';

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

function RequestModal({
  establishment,
  onClose,
}: {
  establishment: DirectorioItem;
  onClose: () => void;
}) {
  const { data: horses } = useHorses();
  const { data: requests } = useBoardingRequests();
  const create = useCreateBoardingRequest();
  const [horseId, setHorseId] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const alreadyRequested = (hId: string) =>
    requests?.some((r) => r.horse_id === hId && r.establishment_id === establishment.id && r.status === 'pending');

  const available = (horses ?? []).filter((h) => h.establishment_id !== establishment.id);

  const handleSubmit = async () => {
    if (!horseId) return;
    await create.mutateAsync({ horse_id: horseId, establishment_id: establishment.id, message: message.trim() || undefined });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
        <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] p-8 text-center shadow-xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="text-base font-bold text-gray-900">¡Solicitud enviada!</p>
          <p className="mt-2 text-sm text-gray-400">{establishment.name} recibirá una notificación y podrá aceptar o rechazar tu solicitud.</p>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-clay-500 py-2.5 text-sm font-semibold text-white cursor-pointer">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--surface-card-border)] px-6 py-4">
          <p className="text-base font-semibold text-gray-900">Solicitar alojamiento</p>
          <button onClick={onClose} aria-label="Cerrar" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Enviás una solicitud a <span className="font-semibold text-gray-800">{establishment.name}</span> para alojar un caballo.
          </p>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Caballo *</label>
            {!available.length ? (
              <p className="text-xs text-gray-400">Todos tus caballos ya están en este establecimiento o no tenés caballos registrados.</p>
            ) : (
              <select
                value={horseId}
                onChange={(e) => setHorseId(e.target.value)}
                className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">Seleccionar caballo...</option>
                {available.map((h) => (
                  <option key={h.id} value={h.id} disabled={!!alreadyRequested(h.id)}>
                    {h.name}{alreadyRequested(h.id) ? ' (solicitud pendiente)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Mensaje (opcional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Presentate brevemente o aclará lo que necesitás..."
              className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2.5 text-sm resize-none focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!horseId || !available.length || create.isPending}
            className="flex-1 rounded-lg bg-clay-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-clay-600 transition"
          >
            {create.isPending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DirectorioPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [requesting, setRequesting] = useState<DirectorioItem | null>(null);
  const { data: items, isLoading } = useDirectorio(debouncedSearch);
  const { data: myRequests } = useBoardingRequests();

  const isPropietario = user?.role === 'propietario';

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  };

  const pendingForEstab = (estabId: string) =>
    myRequests?.some((r) => r.establishment_id === estabId && r.status === 'pending');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de establecimientos"
        subtitle="Encontrá y contactá establecimientos disponibles en HandicApp"
      />

      {/* Solicitudes propias (propietario) */}
      {isPropietario && myRequests && myRequests.filter((r) => r.status === 'pending').length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2">Solicitudes pendientes</p>
          <div className="space-y-2">
            {myRequests.filter((r) => r.status === 'pending').map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">{r.horse?.name}</span>
                <span className="text-amber-500">→</span>
                <span>{r.establishment?.name}</span>
                <span className="ml-auto text-xs text-amber-500">Esperando respuesta</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          className="w-full rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] py-2.5 pl-9 pr-4 text-sm text-gray-700 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/8"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</div>
      ) : !items?.length ? (
        <EmptyState
          icon={search ? SearchIcon : Building2}
          title={search ? 'No encontramos establecimientos' : 'Todavía no hay establecimientos'}
          message={
            search
              ? 'Probá con otro nombre o limpiá la búsqueda para ver el directorio completo.'
              : 'Cuando se registren establecimientos, vas a poder encontrarlos y contactarlos desde acá.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {items.map((item) => {
            const hasPending = pendingForEstab(item.id);
            return (
              <div key={item.id} className="group rounded-2xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200">
                <div className="flex items-start gap-4">
                  <Avatar name={item.name} size="lg" shape="rounded" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate tracking-tight">{item.name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {item.horse_count === 0
                        ? 'Sin caballos alojados'
                        : `${item.horse_count} caballo${item.horse_count !== 1 ? 's' : ''} en pensión`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Activo en HandicApp
                  </span>

                  {isPropietario && (
                    hasPending ? (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                        Solicitud pendiente
                      </span>
                    ) : (
                      <button
                        onClick={() => setRequesting(item)}
                        className="rounded-lg bg-clay-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clay-700 transition cursor-pointer"
                      >
                        Solicitar alojamiento
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {requesting && <RequestModal establishment={requesting} onClose={() => setRequesting(null)} />}
    </div>
  );
}
