'use client';

import { useState } from 'react';
import { useHorses } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent, useAllEvents } from '@/hooks/use-events';
import { useAuth } from '@/lib/auth-context';
import ImagePicker from '@/components/image-picker';
import EventCalendar from '@/components/event-calendar';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api$/, '');

const typeLabels: Record<string, { label: string; color: string }> = {
  salud: { label: 'Salud', color: 'bg-red-50 text-red-700' },
  entrenamiento: { label: 'Entrenamiento', color: 'bg-yellow-50 text-yellow-700' },
  gasto: { label: 'Gasto', color: 'bg-purple-50 text-purple-700' },
  nota: { label: 'Nota', color: 'bg-gray-100 text-gray-700' },
};

const eventTypes = [
  { value: 'salud', label: 'Salud' },
  { value: 'entrenamiento', label: 'Entrenamiento' },
  { value: 'gasto', label: 'Gasto' },
  { value: 'nota', label: 'Nota' },
];

type ViewMode = 'calendar' | 'list';

export default function EventosPage() {
  const { can } = useAuth();
  const { data: horses, isLoading: loadingHorses } = useHorses();
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const { data: events, isLoading: loadingEvents } = useEventsByHorse(selectedHorseId);
  const { data: allEvents, isLoading: loadingAll } = useAllEvents();
  const createEvent = useCreateEvent(selectedHorseId);

  const [view, setView] = useState<ViewMode>('calendar');
  const [calendarHorseId, setCalendarHorseId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('salud');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEvent.mutateAsync({
      type,
      description,
      date,
      horse_id: selectedHorseId,
      photos,
    });
    setDescription('');
    setType('salud');
    setDate(new Date().toISOString().split('T')[0]);
    setPhotos([]);
    setShowForm(false);
  };

  if (loadingHorses) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setView('calendar')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'calendar'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Calendario
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'list'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Lista
            </button>
          </div>

          {view === 'list' && selectedHorseId && can('events', 'create') && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
            >
              {showForm ? 'Cancelar' : '+ Nuevo'}
            </button>
          )}
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <>
          <div className="mb-4">
            <select
              value={calendarHorseId}
              onChange={(e) => setCalendarHorseId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-xs"
            >
              <option value="">Todos los caballos</option>
              {horses?.map((horse) => (
                <option key={horse.id} value={horse.id}>
                  {horse.name}
                </option>
              ))}
            </select>
          </div>
          {loadingAll ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
            </div>
          ) : (
            <EventCalendar
              events={calendarHorseId
                ? (allEvents || []).filter((e) => e.horse_id === calendarHorseId)
                : (allEvents || [])
              }
            />
          )}
        </>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          <div className="mb-6">
            <label htmlFor="horse" className="mb-1 block text-sm font-medium">
              Filtrar por caballo
            </label>
            <select
              id="horse"
              value={selectedHorseId}
              onChange={(e) => {
                setSelectedHorseId(e.target.value);
                setShowForm(false);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-xs"
            >
              <option value="">Todos los caballos</option>
              {horses?.map((horse) => (
                <option key={horse.id} value={horse.id}>
                  {horse.name}
                </option>
              ))}
            </select>
          </div>

          {showForm && selectedHorseId && (
            <form
              onSubmit={handleSubmit}
              className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Tipo</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {eventTypes.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                          type === t.value
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Descripción del evento"
                  />
                </div>

                <div>
                  <label htmlFor="event-date" className="block text-sm font-medium mb-1">
                    Fecha
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:max-w-xs"
                  />
                </div>

                <ImagePicker files={photos} onChange={setPhotos} label="Fotos" />

                {createEvent.isError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    Error al crear el evento
                  </div>
                )}

                <button
                  type="submit"
                  disabled={createEvent.isPending}
                  className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition sm:w-auto"
                >
                  {createEvent.isPending ? 'Creando...' : 'Crear evento'}
                </button>
              </div>
            </form>
          )}

          {(() => {
            const isLoading = selectedHorseId ? loadingEvents : loadingAll;
            const displayEvents = selectedHorseId ? events : allEvents;

            if (isLoading) {
              return (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
                </div>
              );
            }

            if (!displayEvents?.length && !showForm) {
              return (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <p className="text-gray-500">
                    {selectedHorseId ? 'Este caballo no tiene eventos' : 'No hay eventos registrados'}
                  </p>
                </div>
              );
            }

            return displayEvents && displayEvents.length > 0 ? (
              <div className="space-y-3">
                {displayEvents.map((event) => {
                  const typeInfo = typeLabels[event.type] || typeLabels.nota;
                  return (
                    <div
                      key={event.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                          {!selectedHorseId && event.horse && (
                            <span className="text-xs text-gray-400">{event.horse.name}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{event.description}</p>
                      {event.photos && event.photos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
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
                                className="h-20 w-20 rounded-md object-cover border border-gray-200 hover:opacity-80 transition"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null;
          })()}
        </>
      )}
    </div>
  );
}
