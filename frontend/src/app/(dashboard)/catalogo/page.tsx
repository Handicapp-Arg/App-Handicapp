'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  useBreeds, useActivities, useCreateCatalogItem, useDeleteCatalogItem,
} from '@/hooks/use-catalog-items';
import {
  PageHeader, Card, Button, Input, EmptyState, ListSkeleton,
} from '@/components/ui';
import type { CatalogItem } from '@/types';

/* ─── Section ─── */
function CatalogSection({
  title,
  description,
  type,
  items,
  isLoading,
  onCreate,
  onDelete,
  creating,
  deletingId,
}: {
  title: string;
  description: string;
  type: string;
  items: CatalogItem[];
  isLoading: boolean;
  onCreate: (type: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  creating: boolean;
  deletingId: string | null;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('El nombre no puede estar vacío'); return; }
    if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Ya existe un elemento con ese nombre');
      return;
    }
    setError('');
    await onCreate(type, trimmed);
    setName('');
  };

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>

      {/* Agregar */}
      <div className="mb-4 flex gap-2">
        <Input
          placeholder={`Nueva ${title.toLowerCase().slice(0, -1)}...`}
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          loading={creating}
          disabled={creating}
          iconLeft={<Plus className="h-4 w-4" />}
        >
          Agregar
        </Button>
      </div>
      {error && <p className="mb-3 text-xs text-danger-600">{error}</p>}

      {/* Lista */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
          title="Sin elementos"
          message="Agregá el primero usando el campo de arriba."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
              <span className="text-sm text-slate-700">{item.name}</span>
              <button
                onClick={() => void onDelete(item.id)}
                disabled={deletingId === item.id}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ─── Page ─── */
export default function CatalogoPage() {
  const { user } = useAuth();
  const { data: breeds = [], isLoading: loadingBreeds } = useBreeds();
  const { data: activities = [], isLoading: loadingActivities } = useActivities();
  const createItem = useCreateCatalogItem();
  const deleteItem = useDeleteCatalogItem();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
        Solo el administrador puede acceder a esta página.
      </div>
    );
  }

  const handleCreate = async (type: string, name: string) => {
    await createItem.mutateAsync({ type, name });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteItem.mutateAsync(id).catch(() => {});
    setDeletingId(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Catálogo"
        subtitle="Gestioná las razas y actividades disponibles al registrar caballos"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <CatalogSection
          title="Razas"
          description="Razas disponibles al registrar un caballo."
          type="breed"
          items={breeds}
          isLoading={loadingBreeds}
          onCreate={handleCreate}
          onDelete={handleDelete}
          creating={createItem.isPending && createItem.variables?.type === 'breed'}
          deletingId={deletingId}
        />
        <CatalogSection
          title="Actividades"
          description="Disciplinas o actividades equestres disponibles."
          type="activity"
          items={activities}
          isLoading={loadingActivities}
          onCreate={handleCreate}
          onDelete={handleDelete}
          creating={createItem.isPending && createItem.variables?.type === 'activity'}
          deletingId={deletingId}
        />
      </div>
    </div>
  );
}
