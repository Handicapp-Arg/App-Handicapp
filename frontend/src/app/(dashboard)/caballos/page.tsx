'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  useHorses,
  useCreateHorse,
  useUpdateHorse,
  useDeleteHorse,
  useUploadHorseImage,
  useRemoveHorseImage,
  useEstablishments,
  useHorseOwnership,
  useUpdateOwnership,
  usePropietarios,
} from '@/hooks/use-horses';
import { useBreeds, useActivities } from '@/hooks/use-catalog-items';
import { useAuth } from '@/lib/auth-context';
import ImagePicker from '@/components/image-picker';
import ConfirmDialog from '@/components/confirm-dialog';
import type { Horse, HorseOwnership } from '@/types';

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 transition focus:border-[#0f1f3d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/10';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function calcAge(birthDate: string): string {
  const diff = Date.now() - new Date(birthDate + 'T12:00:00').getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return years === 1 ? '1 año' : `${years} años`;
}

function OwnershipSection({
  horseId,
  ownerId,
  canManage,
}: {
  horseId: string;
  ownerId: string;
  canManage: boolean;
}) {
  const { data: ownership, isLoading } = useHorseOwnership(horseId);
  const { data: propietarios } = usePropietarios();
  const updateOwnership = useUpdateOwnership();
  const [editing, setEditing] = useState(false);
  const [entries, setEntries] = useState<{ user_id: string; percentage: number }[]>([]);
  const [error, setError] = useState('');

  const startEditing = () => {
    if (ownership?.length) {
      setEntries(ownership.map((o) => ({ user_id: o.user_id, percentage: Number(o.percentage) || 0 })));
    } else {
      setEntries([{ user_id: ownerId, percentage: 100 }]);
    }
    setError('');
    setEditing(true);
  };

  const total = entries.reduce((s, e) => s + (e.percentage || 0), 0);

  const addEntry = () => {
    setEntries([...entries, { user_id: '', percentage: 0 }]);
  };

  const removeEntry = (idx: number) => {
    if (entries[idx].user_id === ownerId) return;
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (total !== 100) {
      setError(`Los porcentajes deben sumar 100% (actual: ${total}%)`);
      return;
    }
    if (entries.some((e) => !e.user_id)) {
      setError('Seleccioná un propietario para cada entrada');
      return;
    }
    setError('');
    await updateOwnership.mutateAsync({ horseId, owners: entries });
    setEditing(false);
  };

  const usedUserIds = new Set(entries.map((e) => e.user_id));
  const availablePropietarios = propietarios?.filter((p) => !usedUserIds.has(p.id)) ?? [];

  if (isLoading) return <div className="text-xs text-gray-400">Cargando tenencia...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Tenencia</p>
        {canManage && !editing && (
          <button type="button" onClick={startEditing}
            className="text-xs font-medium text-[#0f1f3d] hover:underline cursor-pointer">
            Editar
          </button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-1.5">
          {ownership?.length ? ownership.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-700">{o.user?.name ?? 'Sin nombre'}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {o.percentage != null ? `${Number(o.percentage)}%` : '—'}
              </span>
            </div>
          )) : (
            <p className="text-xs text-gray-400">Propietario único (100%)</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={entry.user_id}
                onChange={(e) => {
                  const updated = [...entries];
                  updated[idx].user_id = e.target.value;
                  setEntries(updated);
                }}
                disabled={entry.user_id === ownerId}
                className={`${inputClass} flex-1 ${entry.user_id === ownerId ? 'opacity-60' : ''}`}
              >
                <option value="">Seleccionar...</option>
                {propietarios?.map((p) => (
                  (p.id === entry.user_id || !usedUserIds.has(p.id) || p.id === entry.user_id) && (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  )
                ))}
              </select>
              <div className="relative w-20">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={entry.percentage || ''}
                  onChange={(e) => {
                    const updated = [...entries];
                    updated[idx].percentage = parseInt(e.target.value) || 0;
                    setEntries(updated);
                  }}
                  className={`${inputClass} pr-6 text-right`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
              {entry.user_id !== ownerId && (
                <button type="button" onClick={() => removeEntry(idx)}
                  className="p-1 text-red-400 hover:text-red-600 cursor-pointer">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${total === 100 ? 'bg-emerald-500' : total > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(total, 100)}%` }}
              />
            </div>
            <p className={`text-xs font-medium ${total === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
              Total: {total}%
            </p>
          </div>

          {availablePropietarios.length > 0 && (
            <button type="button" onClick={addEntry}
              className="flex items-center gap-1 text-xs font-medium text-[#0f1f3d] hover:underline cursor-pointer">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar co-propietario
            </button>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={updateOwnership.isPending}
              className="rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">
              {updateOwnership.isPending ? 'Guardando...' : 'Guardar tenencia'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({
  horse,
  establishments,
  breeds,
  activities,
  onClose,
  onSave,
  onImageUpload,
  onRemoveImage,
  isPending,
  isError,
  canManageOwnership,
}: {
  horse: Horse;
  establishments?: { id: string; name: string }[];
  breeds?: { id: string; name: string }[];
  activities?: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    birth_date: string | null;
    establishment_id: string | null;
    microchip: string | null;
    breed_id: string | null;
    activity_id: string | null;
  }) => Promise<void>;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  isPending: boolean;
  isError: boolean;
  canManageOwnership: boolean;
}) {
  const [name, setName] = useState(horse.name);
  const [birthDate, setBirthDate] = useState(horse.birth_date ?? '');
  const [establishmentId, setEstablishmentId] = useState(horse.establishment_id ?? '');
  const [microchip, setMicrochip] = useState(horse.microchip ?? '');
  const [breedId, setBreedId] = useState(horse.breed_id ?? '');
  const [activityId, setActivityId] = useState(horse.activity_id ?? '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await onSave({
      name,
      birth_date: birthDate || null,
      establishment_id: establishmentId || null,
      microchip: microchip || null,
      breed_id: breedId || null,
      activity_id: activityId || null,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFiles([file]);
    e.target.value = '';
    onImageUpload(file);
  };

  const currentImage = imageFiles.length > 0
    ? URL.createObjectURL(imageFiles[0])
    : horse.image_url;

  const imageSection = (
    <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
      {currentImage ? (
        <img src={currentImage} alt={horse.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      {/* Overlay de acciones */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 py-2 text-xs font-semibold text-white hover:bg-white/30 cursor-pointer">
          Cambiar foto
        </button>
        {currentImage && (
          <button type="button" onClick={onRemoveImage}
            className="rounded-lg bg-red-500/70 backdrop-blur-sm border border-red-400/30 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer">
            Eliminar
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );

  const formFields = (
    <div className="p-5 space-y-5">
      <Field label="Nombre">
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Fecha de nacimiento">
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
      </Field>
      {establishments && establishments.length > 0 && (
        <Field label="Establecimiento">
          <select value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)} className={inputClass}>
            <option value="">Sin establecimiento</option>
            {establishments.map((est) => <option key={est.id} value={est.id}>{est.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Microchip">
        <input
          type="text"
          value={microchip}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 15);
            setMicrochip(v);
          }}
          inputMode="numeric"
          maxLength={15}
          placeholder="15 dígitos numéricos"
          className={inputClass}
        />
      </Field>
      {breeds && breeds.length > 0 && (
        <Field label="Raza">
          <select value={breedId} onChange={(e) => setBreedId(e.target.value)} className={inputClass}>
            <option value="">Sin raza</option>
            {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}
      {activities && activities.length > 0 && (
        <Field label="Actividad">
          <select value={activityId} onChange={(e) => setActivityId(e.target.value)} className={inputClass}>
            <option value="">Sin actividad</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}
      {isError && <p className="text-sm text-red-600">Error al actualizar el caballo</p>}

      {/* Tenencia */}
      <div className="border-t border-gray-100 pt-4">
        <OwnershipSection
          horseId={horse.id}
          ownerId={horse.owner_id}
          canManage={canManageOwnership}
        />
      </div>
    </div>
  );

  return createPortal(
    <>
      {/* ── MOBILE: pantalla completa ── */}
      <div className="fixed inset-0 z-[999] flex flex-col bg-white sm:hidden">
        {/* header */}
        <div className="flex items-center justify-between bg-[#0f1f3d] px-5 py-4">
          <div>
            <p className="font-bold text-white">Editar caballo</p>
            <p className="text-xs text-white/50">{horse.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer">✕</button>
        </div>
        {/* body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {imageSection}
            {formFields}
          </div>
          {/* footer */}
          <div className="border-t border-gray-100 p-5 space-y-3">
            <button type="submit" disabled={isPending}
              className="w-full rounded-xl bg-[#0f1f3d] py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer">
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={onClose}
              className="w-full rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* ── DESKTOP: backdrop + modal ── */}
      <div className="fixed inset-0 z-[998] hidden sm:block bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center p-4">
        <div className="relative flex flex-col w-full max-w-md rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '88dvh' }}>
          <div className="flex items-center justify-between bg-[#0f1f3d] rounded-t-2xl px-6 py-4">
            <div>
              <p className="font-bold text-white">Editar caballo</p>
              <p className="text-xs text-white/50">{horse.name}</p>
            </div>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto">{imageSection}{formFields}</div>
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <button type="submit" disabled={isPending}
                className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer">
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function CaballosPage() {
  const { data: horses, isLoading, error } = useHorses();
  const { user, can } = useAuth();
  const createHorse = useCreateHorse();
  const updateHorse = useUpdateHorse();
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();
  const removeImage = useRemoveHorseImage();
  const { data: establishments } = useEstablishments();
  const { data: breeds } = useBreeds();
  const { data: activities } = useActivities();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [establishmentId, setEstablishmentId] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [breedId, setBreedId] = useState('');
  const [activityId, setActivityId] = useState('');

  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmRemoveImage, setConfirmRemoveImage] = useState(false);

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const horse = await createHorse.mutateAsync({
      name,
      birth_date: birthDate || undefined,
      establishment_id: establishmentId || undefined,
      microchip: microchip || undefined,
      breed_id: breedId || undefined,
      activity_id: activityId || undefined,
    });
    if (imageFiles.length > 0) {
      await uploadImage.mutateAsync({ id: horse.id, file: imageFiles[0] });
    }
    setName(''); setBirthDate(''); setImageFiles([]); setEstablishmentId('');
    setMicrochip(''); setBreedId(''); setActivityId('');
    setShowForm(false);
  };

  const handleSaveEdit = async (data: {
    name: string;
    birth_date: string | null;
    establishment_id: string | null;
    microchip: string | null;
    breed_id: string | null;
    activity_id: string | null;
  }) => {
    if (!editingHorse) return;
    await updateHorse.mutateAsync({ id: editingHorse.id, ...data });
    setEditingHorse(null);
  };

  const handleDelete = (id: string, horseName: string) => {
    setConfirmDelete({ id, name: horseName });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#0f1f3d]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Error al cargar los caballos
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Confirmación eliminar caballo */}
      {confirmDelete && (
        <ConfirmDialog
          title={`¿Eliminar a ${confirmDelete.name}?`}
          message="Esta accion no se puede deshacer. Se eliminaran todos los eventos asociados."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={async () => {
            await deleteHorse.mutateAsync(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirmación eliminar foto */}
      {confirmRemoveImage && editingHorse && (
        <ConfirmDialog
          title="¿Eliminar la foto?"
          message="Se quitara la imagen del caballo."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={() => {
            removeImage.mutate(editingHorse.id);
            setConfirmRemoveImage(false);
          }}
          onCancel={() => setConfirmRemoveImage(false)}
        />
      )}

      {/* Modal edición */}
      {editingHorse && (
        <EditModal
          horse={editingHorse}
          establishments={establishments}
          breeds={breeds}
          activities={activities}
          onClose={() => setEditingHorse(null)}
          onSave={handleSaveEdit}
          onImageUpload={(file) => uploadImage.mutate({ id: editingHorse.id, file })}
          onRemoveImage={() => setConfirmRemoveImage(true)}
          isPending={updateHorse.isPending}
          isError={updateHorse.isError}
          canManageOwnership={user?.role === 'admin' || editingHorse.owner_id === user?.id}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Caballos</h1>
          {horses && horses.length > 0 && (
            <p className="mt-0.5 text-sm text-gray-500">{horses.length} registrado{horses.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {can('horses', 'create') && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition cursor-pointer"
            style={{ backgroundColor: '#0f1f3d' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo caballo
          </button>
        )}
      </div>

      {/* Modal crear */}
      {showForm && createPortal(
        <>
          {/* Mobile */}
          <div className="fixed inset-0 z-[999] flex flex-col bg-white sm:hidden">
            <div className="flex items-center justify-between bg-[#0f1f3d] px-5 py-4">
              <p className="font-bold text-white">Nuevo caballo</p>
              <button onClick={() => setShowForm(false)} className="p-2 text-white/60 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <Field label="Nombre">
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nombre del caballo" />
                </Field>
                <Field label="Fecha de nacimiento (opcional)">
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
                </Field>
                {establishments && establishments.length > 0 && (
                  <Field label="Establecimiento (opcional)">
                    <select value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)} className={inputClass}>
                      <option value="">Sin establecimiento</option>
                      {establishments.map((est) => <option key={est.id} value={est.id}>{est.name}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Microchip (opcional)">
                  <input type="text" value={microchip} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 15); setMicrochip(v); }} inputMode="numeric" maxLength={15} placeholder="15 dígitos numéricos" className={inputClass} />
                </Field>
                {breeds && breeds.length > 0 && (
                  <Field label="Raza (opcional)">
                    <select value={breedId} onChange={(e) => setBreedId(e.target.value)} className={inputClass}>
                      <option value="">Sin raza</option>
                      {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                )}
                {activities && activities.length > 0 && (
                  <Field label="Actividad (opcional)">
                    <select value={activityId} onChange={(e) => setActivityId(e.target.value)} className={inputClass}>
                      <option value="">Sin actividad</option>
                      {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                )}
                <ImagePicker files={imageFiles} onChange={setImageFiles} single label="Foto del caballo" />
                {createHorse.isError && <p className="text-sm text-red-600">Error al crear el caballo</p>}
              </div>
              <div className="border-t border-gray-100 p-5 space-y-3">
                <button type="submit" disabled={createHorse.isPending || uploadImage.isPending}
                  className="w-full rounded-xl bg-[#0f1f3d] py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer">
                  {createHorse.isPending || uploadImage.isPending ? 'Creando...' : 'Crear caballo'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="w-full rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 cursor-pointer">
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* Desktop */}
          <div className="fixed inset-0 z-[998] hidden sm:block bg-black/50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center p-4">
            <div className="relative flex flex-col w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: '88dvh' }}>
              <div className="flex items-center justify-between bg-[#0f1f3d] rounded-t-2xl px-6 py-4">
                <p className="font-bold text-white">Nuevo caballo</p>
                <button onClick={() => setShowForm(false)} className="p-2 text-white/60 hover:text-white cursor-pointer">✕</button>
              </div>
              <form onSubmit={handleCreate} className="flex flex-col overflow-hidden">
                <div className="overflow-y-auto p-6 space-y-4">
                  <Field label="Nombre">
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nombre del caballo" />
                  </Field>
                  <Field label="Fecha de nacimiento (opcional)">
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
                  </Field>
                  {establishments && establishments.length > 0 && (
                    <Field label="Establecimiento (opcional)">
                      <select value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)} className={inputClass}>
                        <option value="">Sin establecimiento</option>
                        {establishments.map((est) => <option key={est.id} value={est.id}>{est.name}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="Microchip (opcional)">
                  <input type="text" value={microchip} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 15); setMicrochip(v); }} inputMode="numeric" maxLength={15} placeholder="15 dígitos numéricos" className={inputClass} />
                </Field>
                {breeds && breeds.length > 0 && (
                  <Field label="Raza (opcional)">
                    <select value={breedId} onChange={(e) => setBreedId(e.target.value)} className={inputClass}>
                      <option value="">Sin raza</option>
                      {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                )}
                {activities && activities.length > 0 && (
                  <Field label="Actividad (opcional)">
                    <select value={activityId} onChange={(e) => setActivityId(e.target.value)} className={inputClass}>
                      <option value="">Sin actividad</option>
                      {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                )}
                <ImagePicker files={imageFiles} onChange={setImageFiles} single label="Foto del caballo" />
                  {createHorse.isError && <p className="text-sm text-red-600">Error al crear el caballo</p>}
                </div>
                <div className="flex gap-2 border-t border-gray-100 p-4">
                  <button type="submit" disabled={createHorse.isPending || uploadImage.isPending}
                    className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer">
                    {createHorse.isPending || uploadImage.isPending ? 'Creando...' : 'Crear caballo'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Lista vacía */}
      {!horses?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl">
            🐴
          </div>
          <p className="text-sm font-medium text-gray-600">No hay caballos registrados</p>
          <p className="mt-1 text-xs text-gray-400">Creá el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {horses.map((horse) => (
            <div key={horse.id}
              className="group rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md overflow-hidden">

              {/* Imagen */}
              <div className="aspect-[4/3] bg-gray-100">
                {horse.image_url ? (
                  <img src={horse.image_url} alt={horse.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-4">
                {/* Nombre + badges */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-gray-900">{horse.name}</h2>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {horse.establishment && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {horse.establishment.name}
                      </span>
                    )}
                    {horse.co_owners && horse.co_owners.length > 0 ? (
                      horse.co_owners.map((co) => (
                        <span key={co.id} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {co.user?.name ?? 'Sin nombre'}{co.percentage != null ? ` ${Number(co.percentage)}%` : ''}
                        </span>
                      ))
                    ) : (
                      horse.owner && user?.role !== 'propietario' && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {horse.owner.name}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Badges raza/actividad */}
                {(horse.breed || horse.activity) && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {horse.breed && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                        {horse.breed.name}
                      </span>
                    )}
                    {horse.activity && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {horse.activity.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Datos */}
                <div className="mb-4 space-y-0.5 text-xs text-gray-500">
                  {horse.microchip && <p>Microchip: {horse.microchip}</p>}
                  {horse.birth_date && (
                    <p>
                      {new Date(horse.birth_date + 'T12:00:00').toLocaleDateString('es-AR')}
                      {' · '}{calcAge(horse.birth_date)}
                    </p>
                  )}
                  <p>Registrado {new Date(horse.created_at).toLocaleDateString('es-AR')}</p>
                </div>

                {/* Acciones */}
                {(can('horses', 'update') || can('horses', 'delete')) && (
                  <div className="flex gap-2">
                    {can('horses', 'update') && (
                      <button onClick={() => setEditingHorse(horse)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-[#0f1f3d] hover:text-[#0f1f3d] cursor-pointer">
                        Editar
                      </button>
                    )}
                    {can('horses', 'delete') && (
                      <button onClick={() => handleDelete(horse.id, horse.name)} disabled={deleteHorse.isPending}
                        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
