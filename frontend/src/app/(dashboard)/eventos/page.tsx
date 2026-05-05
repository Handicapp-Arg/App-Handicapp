'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHorses } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent, useAllEvents, useCreateBulkEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/use-events';
import { useAuth } from '@/lib/auth-context';
import ImagePicker from '@/components/image-picker';
import EventCalendar from '@/components/event-calendar';
import ConfirmDialog from '@/components/confirm-dialog';
import type { Event } from '@/types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api$/, '');

const typeOptions = [
  { value: 'salud', label: 'Salud', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'entrenamiento', label: 'Entrenamiento', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'gasto', label: 'Gasto', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'nota', label: 'Nota', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const typeBadge: Record<string, string> = {
  salud: 'bg-red-50 text-red-700',
  entrenamiento: 'bg-yellow-50 text-yellow-700',
  gasto: 'bg-purple-50 text-purple-700',
  nota: 'bg-gray-100 text-gray-700',
};

type ViewMode = 'calendar' | 'list';

function HorseSelector({
  horses,
  selectedIds,
  onChange,
}: {
  horses: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? horses.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()))
    : horses;

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const toggleAll = () => {
    onChange(selectedIds.length === horses.length ? [] : horses.map((h) => h.id));
  };

  const summary =
    selectedIds.length === 0
      ? 'Seleccionar caballos'
      : selectedIds.length === 1
        ? horses.find((h) => h.id === selectedIds[0])?.name ?? '1 caballo'
        : selectedIds.length === horses.length
          ? 'Todos los caballos'
          : `${selectedIds.length} caballos seleccionados`;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">Caballos</label>
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition hover:bg-gray-100 cursor-pointer"
        >
          <span className={selectedIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
            {summary}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Buscador + seleccionar todos */}
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
              {horses.length > 5 && (
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                  autoFocus
                />
              )}
              {horses.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="shrink-0 text-xs font-medium cursor-pointer transition whitespace-nowrap"
                  style={{ color: '#0f1f3d' }}
                >
                  {selectedIds.length === horses.length ? 'Ninguno' : 'Todos'}
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
              ) : (
                filtered.map((h) => (
                  <label
                    key={h.id}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(h.id)}
                      onChange={() => toggle(h.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#0f1f3d]"
                    />
                    <span className="text-sm text-gray-900">{h.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pills de seleccionados (max 3 visibles) */}
        {selectedIds.length > 0 && selectedIds.length <= 3 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedIds.map((id) => {
              const name = horses.find((h) => h.id === id)?.name ?? '';
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditEventModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const updateEvent = useUpdateEvent();
  const [type, setType] = useState(event.type as string);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(event.date);
  const [amount, setAmount] = useState(event.amount != null ? String(event.amount) : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateEvent.mutateAsync({
      id: event.id,
      type,
      description,
      date,
      amount: type === 'gasto' && amount ? amount : undefined,
    });
    onClose();
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {typeOptions.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition cursor-pointer ${
                type === t.value ? t.color + ' font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Fecha</label>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
        />
      </div>
      {type === 'gasto' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Monto ($)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm resize-none focus:border-gray-400 focus:bg-white focus:outline-none"
        />
      </div>
      {updateEvent.isError && <p className="text-xs text-red-600">Error al guardar. Intentá de nuevo.</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button type="submit" disabled={updateEvent.isPending}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition cursor-pointer"
          style={{ backgroundColor: '#0f1f3d' }}
        >
          {updateEvent.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );

  const modal = (
    <>
      <div className="fixed inset-0 z-[999] flex flex-col bg-white sm:hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#0f1f3d' }}>
          <h2 className="text-base font-semibold text-white">Editar evento</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition cursor-pointer">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{formContent}</div>
      </div>
      <div className="hidden sm:flex fixed inset-0 z-[998] items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ backgroundColor: '#0f1f3d' }}>
            <h2 className="text-base font-semibold text-white">Editar evento</h2>
            <button onClick={onClose} className="text-white/70 hover:text-white transition cursor-pointer">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1">{formContent}</div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

function CreateEventModal({ horses, onClose }: { horses: { id: string; name: string }[]; onClose: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    horses.length === 1 ? [horses[0].id] : [],
  );
  const [type, setType] = useState('salud');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  const isSingle = selectedIds.length === 1;
  const createSingle = useCreateEvent(selectedIds[0] ?? '');
  const createBulk = useCreateBulkEvent();
  const isPending = isSingle ? createSingle.isPending : createBulk.isPending;
  const isError = isSingle ? createSingle.isError : createBulk.isError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIds.length) return;
    const amountValue = type === 'gasto' && amount ? amount : undefined;

    if (isSingle) {
      await createSingle.mutateAsync({
        type, description, date, horse_id: selectedIds[0], photos,
        amount: amountValue,
      });
    } else {
      await createBulk.mutateAsync({
        type, description, date, horse_ids: selectedIds,
        amount: amountValue,
      });
    }
    onClose();
  };

  const submitLabel = isPending
    ? 'Creando...'
    : selectedIds.length <= 1
      ? 'Crear evento'
      : `Crear ${selectedIds.length} eventos`;

  const formContent = (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Caballos */}
      <HorseSelector horses={horses} selectedIds={selectedIds} onChange={setSelectedIds} />

      {/* Tipo */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {typeOptions.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition cursor-pointer ${
                type === t.value ? t.color + ' font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fecha */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Fecha</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Monto (solo gasto) */}
      {type === 'gasto' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Monto ($)</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
          />
        </div>
      )}

      {/* Descripción */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describí el evento..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm resize-none focus:border-gray-400 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Fotos (solo cuando hay 1 caballo seleccionado) */}
      {isSingle && (
        <ImagePicker files={photos} onChange={setPhotos} label="Fotos (opcional)" />
      )}

      {isError && (
        <p className="text-xs text-red-600">Error al crear el evento. Intentá de nuevo.</p>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !selectedIds.length}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition cursor-pointer"
          style={{ backgroundColor: '#0f1f3d' }}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  const modal = (
    <>
      {/* Mobile: full screen */}
      <div className="fixed inset-0 z-[999] flex flex-col bg-white sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: '#0f1f3d' }}>
          <h2 className="text-base font-semibold text-white">Nuevo evento</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition cursor-pointer">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {formContent}
        </div>
      </div>

      {/* Desktop: centered modal */}
      <div className="hidden sm:flex fixed inset-0 z-[998] items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ backgroundColor: '#0f1f3d' }}>
            <h2 className="text-base font-semibold text-white">Nuevo evento</h2>
            <button onClick={onClose} className="text-white/70 hover:text-white transition cursor-pointer">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {formContent}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

export default function EventosPage() {
  const { can } = useAuth();
  const { data: horses, isLoading: loadingHorses } = useHorses();
  const [view, setView] = useState<ViewMode>('list');
  const [filterHorseId, setFilterHorseId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const deleteEvent = useDeleteEvent();

  const { data: events, isLoading: loadingEvents } = useEventsByHorse(filterHorseId);
  const { data: allEvents, isLoading: loadingAll } = useAllEvents();

  const displayEvents = filterHorseId ? events : allEvents;
  const isLoading = filterHorseId ? loadingEvents : loadingAll;

  if (loadingHorses) return (
    <div className="flex justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Eventos</h1>
        <div className="flex items-center gap-2">
          {/* Toggle calendario/lista */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setView('list')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Calendario
            </button>
          </div>

          {can('events', 'create') && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition cursor-pointer"
              style={{ backgroundColor: '#0f1f3d' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Filtro por caballo */}
      <div className="flex items-center gap-3">
        <select
          value={filterHorseId}
          onChange={(e) => setFilterHorseId(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
        >
          <option value="">Todos los caballos</option>
          {horses?.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        {filterHorseId && (
          <button
            onClick={() => setFilterHorseId('')}
            className="text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Vista calendario */}
      {view === 'calendar' && (
        isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
          </div>
        ) : (
          <EventCalendar
            events={filterHorseId
              ? (allEvents || []).filter((e) => e.horse_id === filterHorseId)
              : (allEvents || [])}
          />
        )
      )}

      {/* Vista lista */}
      {view === 'list' && (
        isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
          </div>
        ) : !displayEvents?.length ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
            <p className="text-sm text-gray-400">
              {filterHorseId ? 'Este caballo no tiene eventos' : 'No hay eventos registrados'}
            </p>
            {can('events', 'create') && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 text-sm font-medium underline cursor-pointer"
                style={{ color: '#0f1f3d' }}
              >
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadge[event.type] || typeBadge.nota}`}>
                      {typeOptions.find(t => t.value === event.type)?.label || event.type}
                    </span>
                    {event.horse && (
                      <span className="text-xs text-gray-400 font-medium">{event.horse.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {(can('events', 'update') || can('events', 'delete')) && (
                      <div className="relative flex gap-1">
                        {can('events', 'update') && (
                          <button
                            onClick={() => setEditingEvent(event)}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
                            title="Editar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        )}
                        {can('events', 'delete') && (
                          <button
                            onClick={() => setDeletingEventId(event.id)}
                            className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {event.amount != null && (
                  <p className="text-sm font-semibold text-purple-700 mb-1">
                    ${Number(event.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
                {event.photos && event.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.photos.map((photo) =>
                      photo.file_type === 'pdf' ? (
                        <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                        >
                          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          PDF
                        </a>
                      ) : (
                        <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                          <img src={photo.url} alt="Foto del evento"
                            className="h-16 w-16 rounded-lg object-cover border border-gray-100 hover:opacity-80 transition sm:h-20 sm:w-20"
                          />
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal crear */}
      {showCreate && horses && (
        <CreateEventModal horses={horses} onClose={() => setShowCreate(false)} />
      )}

      {/* Modal editar */}
      {editingEvent && (
        <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}

      {/* Confirmar eliminar */}
      {deletingEventId && (
        <ConfirmDialog
          title="¿Eliminar evento?"
          message="El evento quedará en el historial del sistema pero no será visible."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={async () => {
            await deleteEvent.mutateAsync(deletingEventId);
            setDeletingEventId(null);
          }}
          onCancel={() => setDeletingEventId(null)}
        />
      )}
    </div>
  );
}
