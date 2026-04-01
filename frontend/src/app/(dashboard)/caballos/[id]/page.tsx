'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useHorse, useHorseOwnership, useDeleteHorse } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent } from '@/hooks/use-events';
import { useAuth } from '@/lib/auth-context';
import ConfirmDialog from '@/components/confirm-dialog';
import ImagePicker from '@/components/image-picker';
import type { Event } from '@/types';

/* ─── Constants ─── */

const typeBadge: Record<string, { label: string; cls: string }> = {
  salud:         { label: 'Salud',         cls: 'bg-red-50 text-red-700' },
  entrenamiento: { label: 'Entrenamiento', cls: 'bg-yellow-50 text-yellow-700' },
  gasto:         { label: 'Gasto',         cls: 'bg-purple-50 text-purple-700' },
  nota:          { label: 'Nota',          cls: 'bg-gray-100 text-gray-700' },
};

const typeOptions = [
  { value: 'salud', label: 'Salud' },
  { value: 'entrenamiento', label: 'Entrenamiento' },
  { value: 'gasto', label: 'Gasto' },
  { value: 'nota', label: 'Nota' },
];

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 transition focus:border-[#0f1f3d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/10';

/* ─── Helpers ─── */

function calcAge(birthDate: string): string {
  const diff = Date.now() - new Date(birthDate + 'T12:00:00').getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return years === 1 ? '1 año' : `${years} años`;
}

function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ─── Info Row ─── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="truncate text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/* ─── Event Card ─── */

function EventCard({ event }: { event: Event }) {
  const badge = typeBadge[event.type] ?? typeBadge.nota;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="text-[11px] text-gray-400">
          {formatDate(event.date)}
        </span>
      </div>
      <p className="text-sm text-gray-700 line-clamp-2">{event.description}</p>
      {event.type === 'gasto' && event.amount != null && (
        <p className="mt-1 text-sm font-semibold text-purple-700">
          ${Number(event.amount).toLocaleString('es-AR')}
        </p>
      )}
      {event.photos && event.photos.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {event.photos.map((p) => (
            <img
              key={p.id}
              src={p.url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Create Event Modal ─── */

function CreateEventModal({
  horseId,
  horseName,
  onClose,
}: {
  horseId: string;
  horseName: string;
  onClose: () => void;
}) {
  const createEvent = useCreateEvent(horseId);
  const [type, setType] = useState('salud');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('La descripcion es obligatoria');
      return;
    }
    setError('');
    await createEvent.mutateAsync({
      type,
      description,
      date,
      horse_id: horseId,
      amount: type === 'gasto' && amount ? amount : undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
    onClose();
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Tipo</label>
        <div className="grid grid-cols-4 gap-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                type === opt.value
                  ? 'border-[#0f1f3d] bg-[#0f1f3d] text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Descripcion</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Detalle del evento..."
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Fecha</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      {type === 'gasto' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Monto</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
      )}
      <ImagePicker files={photos} onChange={setPhotos} label="Fotos (opcional)" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {createEvent.isError && <p className="text-xs text-red-500">Error al crear el evento</p>}
    </div>
  );

  return createPortal(
    <>
      {/* Mobile */}
      <div className="fixed inset-0 z-[999] flex flex-col bg-white sm:hidden">
        <div className="flex items-center justify-between bg-[#0f1f3d] px-5 py-4">
          <div>
            <p className="font-bold text-white">Nuevo evento</p>
            <p className="text-xs text-white/50">{horseName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">{formContent}</div>
          <div className="border-t border-gray-100 p-5 space-y-3">
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="w-full rounded-xl bg-[#0f1f3d] py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {createEvent.isPending ? 'Creando...' : 'Crear evento'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* Desktop */}
      <div className="fixed inset-0 z-[998] hidden sm:block bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center p-4">
        <div
          className="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
          style={{ maxHeight: '88dvh' }}
        >
          <div className="flex items-center justify-between rounded-t-2xl bg-[#0f1f3d] px-6 py-4">
            <div>
              <p className="font-bold text-white">Nuevo evento</p>
              <p className="text-xs text-white/50">{horseName}</p>
            </div>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer">
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto p-6">{formContent}</div>
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <button
                type="submit"
                disabled={createEvent.isPending}
                className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                {createEvent.isPending ? 'Creando...' : 'Crear evento'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ─── Main Page ─── */

export default function HorseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, can } = useAuth();

  const { data: horse, isLoading, error } = useHorse(id);
  const { data: ownership } = useHorseOwnership(id);
  const { data: events } = useEventsByHorse(id);
  const deleteHorse = useDeleteHorse();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const canEdit = can('horses', 'update');
  const canDelete = can('horses', 'delete');
  const canCreateEvent = can('events', 'create');

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#0f1f3d]" />
      </div>
    );
  }

  /* ─── Error / Not Found ─── */
  if (error || !horse) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-gray-500">No se encontro el caballo</p>
        <Link href="/caballos" className="text-sm font-medium text-[#0f1f3d] hover:underline">
          Volver a caballos
        </Link>
      </div>
    );
  }

  const sortedEvents = events
    ? [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <div className="space-y-6 pb-8">

      {/* Confirmacion eliminar */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Eliminar a ${horse.name}?`}
          message="Esta accion no se puede deshacer. Se eliminaran todos los eventos asociados."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={async () => {
            await deleteHorse.mutateAsync(horse.id);
            router.push('/caballos');
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Modal crear evento */}
      {showCreateEvent && (
        <CreateEventModal
          horseId={horse.id}
          horseName={horse.name}
          onClose={() => setShowCreateEvent(false)}
        />
      )}

      {/* ─── Back + Actions ─── */}
      <div className="flex items-center justify-between">
        <Link
          href="/caballos"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Caballos
        </Link>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href="/caballos"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-[#0f1f3d] hover:text-[#0f1f3d]"
            >
              Editar
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:border-red-300 hover:bg-red-50 cursor-pointer"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* ─── Header: Image + Name ─── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Image */}
        <div className="aspect-[16/9] bg-gray-100">
          {horse.image_url ? (
            <img
              src={horse.image_url}
              alt={horse.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Name + badges */}
        <div className="p-5">
          <h1 className="text-xl font-bold text-gray-900">{horse.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {horse.establishment && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {horse.establishment.name}
              </span>
            )}
            {horse.breed && (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                {horse.breed.name}
              </span>
            )}
            {horse.activity && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {horse.activity.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Info Section ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Informacion</h2>
        <div className="divide-y divide-gray-100">
          {horse.birth_date && (
            <InfoRow
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
              label="Nacimiento"
              value={`${formatDate(horse.birth_date)} (${calcAge(horse.birth_date)})`}
            />
          )}
          {horse.microchip && (
            <InfoRow
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>}
              label="Microchip"
              value={horse.microchip}
            />
          )}
          {horse.owner && (
            <InfoRow
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
              label="Propietario"
              value={horse.owner.name}
            />
          )}
          <InfoRow
            icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Registrado"
            value={new Date(horse.created_at).toLocaleDateString('es-AR')}
          />
        </div>
      </div>

      {/* ─── Ownership Section ─── */}
      {ownership && ownership.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Tenencia</h2>
          <div className="space-y-2">
            {ownership.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <span className="text-sm text-gray-700">{o.user?.name ?? 'Sin nombre'}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {o.percentage != null ? `${Number(o.percentage)}%` : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Events Section ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Eventos
            {sortedEvents.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">({sortedEvents.length})</span>
            )}
          </h2>
          {canCreateEvent && (
            <button
              onClick={() => setShowCreateEvent(true)}
              className="flex items-center gap-1 rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0f1f3d]/90 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo evento
            </button>
          )}
        </div>

        {sortedEvents.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">Sin eventos registrados</p>
        ) : (
          <div className="space-y-2.5">
            {sortedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
