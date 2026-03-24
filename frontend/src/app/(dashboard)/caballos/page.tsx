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
} from '@/hooks/use-horses';
import { useAuth } from '@/lib/auth-context';
import ImagePicker from '@/components/image-picker';
import type { Horse } from '@/types';

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

function EditModal({
  horse,
  establishments,
  onClose,
  onSave,
  onImageUpload,
  onRemoveImage,
  isPending,
  isError,
}: {
  horse: Horse;
  establishments?: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: { name: string; birth_date: string | null; establishment_id: string | null }) => Promise<void>;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  isPending: boolean;
  isError: boolean;
}) {
  const [name, setName] = useState(horse.name);
  const [birthDate, setBirthDate] = useState(horse.birth_date ?? '');
  const [establishmentId, setEstablishmentId] = useState(horse.establishment_id ?? '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await onSave({ name, birth_date: birthDate || null, establishment_id: establishmentId || null });
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
      {isError && <p className="text-sm text-red-600">Error al actualizar el caballo</p>}
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

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [establishmentId, setEstablishmentId] = useState('');

  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const horse = await createHorse.mutateAsync({
      name,
      birth_date: birthDate || undefined,
      establishment_id: establishmentId || undefined,
    });
    if (imageFiles.length > 0) {
      await uploadImage.mutateAsync({ id: horse.id, file: imageFiles[0] });
    }
    setName(''); setBirthDate(''); setImageFiles([]); setEstablishmentId('');
    setShowForm(false);
  };

  const handleSaveEdit = async (data: { name: string; birth_date: string | null; establishment_id: string | null }) => {
    if (!editingHorse) return;
    await updateHorse.mutateAsync({ id: editingHorse.id, ...data });
    setEditingHorse(null);
  };

  const handleDelete = async (id: string, horseName: string) => {
    if (!confirm(`¿Eliminar a ${horseName}? Esta acción no se puede deshacer.`)) return;
    await deleteHorse.mutateAsync(id);
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

      {/* Modal edición */}
      {editingHorse && (
        <EditModal
          horse={editingHorse}
          establishments={establishments}
          onClose={() => setEditingHorse(null)}
          onSave={handleSaveEdit}
          onImageUpload={(file) => uploadImage.mutate({ id: editingHorse.id, file })}
          onRemoveImage={() => {
            if (confirm('¿Eliminar la foto?')) removeImage.mutate(editingHorse.id);
          }}
          isPending={updateHorse.isPending}
          isError={updateHorse.isError}
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
            className="rounded-lg bg-[#0f1f3d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a2f5a] cursor-pointer"
          >
            + Nuevo caballo
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
                    {horse.owner && user?.role !== 'propietario' && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {horse.owner.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Datos */}
                <div className="mb-4 space-y-0.5 text-xs text-gray-500">
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
