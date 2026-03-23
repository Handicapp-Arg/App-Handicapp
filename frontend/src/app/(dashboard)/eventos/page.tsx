'use client';

import { useState } from 'react';
import { useHorses } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent } from '@/hooks/use-events';
import { useAuth } from '@/lib/auth-context';
import PhotoCapture from '@/components/photo-capture';

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

export default function EventosPage() {
  const { can } = useAuth();
  const { data: horses, isLoading: loadingHorses } = useHorses();
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const { data: events, isLoading: loadingEvents } = useEventsByHorse(selectedHorseId);
  const createEvent = useCreateEvent(selectedHorseId);

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eventos</h1>
        {selectedHorseId && can('events', 'create') && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="horse" className="mb-1 block text-sm font-medium">
          Seleccioná un caballo
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
          <option value="">-- Elegir caballo --</option>
          {horses?.map((horse) => (
            <option key={horse.id} value={horse.id}>
              {horse.name}
            </option>
          ))}
        </select>
      </div>

      {selectedHorseId && showForm && (
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

            <PhotoCapture photos={photos} onChange={setPhotos} />

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

      {!selectedHorseId && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            Seleccioná un caballo para ver sus eventos
          </p>
        </div>
      )}

      {selectedHorseId && loadingEvents && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
        </div>
      )}

      {selectedHorseId && !loadingEvents && !events?.length && !showForm && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">Este caballo no tiene eventos</p>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="space-y-3">
          {events.map((event) => {
            const typeInfo = typeLabels[event.type] || typeLabels.nota;
            return (
              <div
                key={event.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}
                  >
                    {typeInfo.label}
                  </span>
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
      )}
    </div>
  );
}
