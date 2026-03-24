'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useHorses } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent, useAllEvents } from '@/hooks/use-events';
import { useAuth } from '@/lib/auth-context';
import ImagePicker from '@/components/image-picker';
import EventCalendar from '@/components/event-calendar';

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

function CreateModal({ horses, onClose }: { horses: { id: string; name: string }[]; onClose: () => void }) {
  const [horseId, setHorseId] = useState(horses.length === 1 ? horses[0].id : '');
  const [type, setType] = useState('salud');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const createEvent = useCreateEvent(horseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horseId) return;
    await createEvent.mutateAsync({
      type, description, date, horse_id: horseId, photos,
      amount: type === 'gasto' && amount ? amount : undefined,
    });
    onClose();
  };

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
          <ModalForm
            horses={horses} horseId={horseId} setHorseId={setHorseId}
            type={type} setType={setType} description={description} setDescription={setDescription}
            date={date} setDate={setDate} amount={amount} setAmount={setAmount}
            photos={photos} setPhotos={setPhotos}
            onSubmit={handleSubmit} isPending={createEvent.isPending} isError={createEvent.isError}
            onCancel={onClose}
          />
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
            <ModalForm
              horses={horses} horseId={horseId} setHorseId={setHorseId}
              type={type} setType={setType} description={description} setDescription={setDescription}
              date={date} setDate={setDate} amount={amount} setAmount={setAmount}
              photos={photos} setPhotos={setPhotos}
              onSubmit={handleSubmit} isPending={createEvent.isPending} isError={createEvent.isError}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}

function ModalForm({
  horses, horseId, setHorseId, type, setType, description, setDescription,
  date, setDate, amount, setAmount, photos, setPhotos, onSubmit, isPending, isError, onCancel,
}: {
  horses: { id: string; name: string }[];
  horseId: string; setHorseId: (v: string) => void;
  type: string; setType: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  date: string; setDate: (v: string) => void;
  amount: string; setAmount: (v: string) => void;
  photos: File[]; setPhotos: (v: File[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean; isError: boolean; onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4">
      {/* Caballo */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Caballo</label>
        <select
          required
          value={horseId}
          onChange={(e) => setHorseId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
        >
          <option value="">Seleccionar caballo</option>
          {horses.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

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

      {/* Fotos */}
      <ImagePicker files={photos} onChange={setPhotos} label="Fotos (opcional)" />

      {isError && (
        <p className="text-xs text-red-600">Error al crear el evento. Intentá de nuevo.</p>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !horseId}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition cursor-pointer"
          style={{ backgroundColor: '#0f1f3d' }}
        >
          {isPending ? 'Creando...' : 'Crear evento'}
        </button>
      </div>
    </form>
  );
}

export default function EventosPage() {
  const { can } = useAuth();
  const { data: horses, isLoading: loadingHorses } = useHorses();
  const [view, setView] = useState<ViewMode>('list');
  const [filterHorseId, setFilterHorseId] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {event.amount != null && (
                  <p className="text-sm font-semibold text-purple-700 mb-1">
                    ${Number(event.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
                {event.photos && event.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={`${API_URL}/uploads/events/${photo.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={`${API_URL}/uploads/events/${photo.filename}`}
                          alt="Foto del evento"
                          className="h-16 w-16 rounded-lg object-cover border border-gray-100 hover:opacity-80 transition sm:h-20 sm:w-20"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal crear */}
      {showCreate && horses && (
        <CreateModal horses={horses} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
