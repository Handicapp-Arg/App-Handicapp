'use client';

import { useState } from 'react';
import {
  useHorses,
  useCreateHorse,
  useUpdateHorse,
  useDeleteHorse,
} from '@/hooks/use-horses';
import { useAuth } from '@/lib/auth-context';
import type { Horse } from '@/types';

export default function CaballosPage() {
  const { data: horses, isLoading, error } = useHorses();
  const { user, can } = useAuth();
  const createHorse = useCreateHorse();
  const updateHorse = useUpdateHorse();
  const deleteHorse = useDeleteHorse();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createHorse.mutateAsync({
      name,
      birth_date: birthDate || undefined,
    });
    setName('');
    setBirthDate('');
    setShowForm(false);
  };

  const startEdit = (horse: Horse) => {
    setEditingId(horse.id);
    setEditName(horse.name);
    setEditBirthDate(horse.birth_date ?? '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    await updateHorse.mutateAsync({
      id: editingId,
      name: editName,
      birth_date: editBirthDate || null,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string, horseName: string) => {
    if (!confirm(`¿Eliminar a ${horseName}? Esta acción no se puede deshacer.`)) return;
    await deleteHorse.mutateAsync(id);
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
        {can('horses', 'create') && (
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
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
          {horses.map((horse) =>
            editingId === horse.id ? (
              <form
                key={horse.id}
                onSubmit={handleUpdate}
                className="rounded-lg border-2 border-black bg-white p-4 shadow-sm"
              >
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {updateHorse.isError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      Error al actualizar
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={updateHorse.isPending}
                      className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      {updateHorse.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            ) : (
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

                <div className="mb-3 space-y-1 text-sm text-gray-600">
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

                {(can('horses', 'update') || can('horses', 'delete')) && (
                  <div className="flex gap-2">
                    {can('horses', 'update') && (
                      <button
                        onClick={() => { startEdit(horse); setShowForm(false); }}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        Editar
                      </button>
                    )}
                    {can('horses', 'delete') && (
                      <button
                        onClick={() => handleDelete(horse.id, horse.name)}
                        disabled={deleteHorse.isPending}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
