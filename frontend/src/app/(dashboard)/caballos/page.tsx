'use client';

import { useState } from 'react';
import { useHorses, useCreateHorse } from '@/hooks/use-horses';
import { useAuth } from '@/lib/auth-context';

export default function CaballosPage() {
  const { data: horses, isLoading, error } = useHorses();
  const { user } = useAuth();
  const createHorse = useCreateHorse();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createHorse.mutateAsync({
      name,
      birth_date: birthDate || undefined,
    });
    setName('');
    setBirthDate('');
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
        Error al cargar los caballos
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Caballos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
        >
          {showForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Nombre del caballo"
              />
            </div>
            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium mb-1">
                Fecha de nacimiento (opcional)
              </label>
              <input
                id="birth_date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            {createHorse.isError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                Error al crear el caballo
              </div>
            )}

            <button
              type="submit"
              disabled={createHorse.isPending}
              className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition sm:w-auto"
            >
              {createHorse.isPending ? 'Creando...' : 'Crear caballo'}
            </button>
          </div>
        </form>
      )}

      {!horses?.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No tenés caballos registrados</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {horses.map((horse) => (
            <div
              key={horse.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <h2 className="text-lg font-semibold">{horse.name}</h2>
                {horse.establishment && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {horse.establishment.name}
                  </span>
                )}
                {horse.owner && user?.role === 'establecimiento' && (
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {horse.owner.name}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                {horse.birth_date && (
                  <p>
                    Nacimiento:{' '}
                    {new Date(horse.birth_date + 'T12:00:00').toLocaleDateString('es-AR')}
                  </p>
                )}
                <p>
                  Registrado:{' '}
                  {new Date(horse.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
