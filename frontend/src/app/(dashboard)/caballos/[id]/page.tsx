'use client';

import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useHorse, useHorseOwnership, useDeleteHorse, useTransferHorse, usePropietarios, useHorseVets, useAssignVet, useRemoveVet, useVeterinarios, useHorseDocuments, useUploadDocument, useDeleteDocument, useWeightRecords, useAddWeightRecord, useDeleteWeightRecord } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/use-events';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { useRoutines, useUpsertRoutine } from '@/hooks/use-routines';
import { useActivityPhotos, useUploadActivityPhoto, useDeleteActivityPhoto, ACTIVITY_TYPES } from '@/hooks/use-activity-photos';
import { useMedicalRecords, useAddMedicalRecord, useDeleteMedicalRecord, type MedicalRecord, type CreateMedicalRecordDto } from '@/hooks/use-medical';
import { TrainingMetricsPanel } from '@/components/training-metrics-panel';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ConfirmDialog from '@/components/confirm-dialog';
import ImagePicker from '@/components/image-picker';
import { cldTransform } from '@/lib/cloudinary';
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

/* ─── Info Item ─── */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}

/* ─── Edit Event Modal ─── */

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

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none';

  const formContent = (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {typeOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={`rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                type === opt.value ? 'border-[#0f1f3d] bg-[#0f1f3d] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Fecha</label>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </div>
      {type === 'gasto' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Monto ($)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} resize-none`} />
      </div>
      {updateEvent.isError && <p className="text-xs text-red-500">Error al guardar. Intentá de nuevo.</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button type="submit" disabled={updateEvent.isPending}
          className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
        >
          {updateEvent.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999] flex flex-col bg-white sm:hidden">
        <div className="flex items-center justify-between bg-[#0f1f3d] px-5 py-4">
          <p className="font-bold text-white">Editar evento</p>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">{formContent}</div>
      </div>
      <div className="fixed inset-0 z-[998] hidden sm:block bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center p-4">
        <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: '88dvh' }}>
          <div className="flex items-center justify-between rounded-t-2xl bg-[#0f1f3d] px-6 py-4">
            <p className="font-bold text-white">Editar evento</p>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer">✕</button>
          </div>
          <div className="overflow-y-auto flex-1">{formContent}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ─── Event Card ─── */

function EventCard({
  event,
  onEdit,
  onDelete,
  canEditMetrics,
}: {
  event: Event;
  onEdit?: (e: Event) => void;
  onDelete?: (id: string) => void;
  canEditMetrics?: boolean;
}) {
  const badge = typeBadge[event.type] ?? typeBadge.nota;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-400">{formatDate(event.date)}</span>
          {onEdit && (
            <button onClick={() => onEdit(event)}
              className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition cursor-pointer"
              title="Editar"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(event.id)}
              className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
              title="Eliminar"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
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
            <img key={p.id} src={p.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
          ))}
        </div>
      )}
      {event.type === 'entrenamiento' && (
        <TrainingMetricsPanel eventId={event.id} canEdit={canEditMetrics ?? false} />
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

/* ─── Medical Labels ─── */

const medicalTypeLabel: Record<string, string> = {
  vacuna: 'Vacuna', desparasitacion: 'Desparasitación', analisis: 'Análisis', tratamiento: 'Tratamiento',
};
const medicalTypeBadge: Record<string, string> = {
  vacuna: 'bg-green-50 text-green-700', desparasitacion: 'bg-orange-50 text-orange-700',
  analisis: 'bg-blue-50 text-blue-700', tratamiento: 'bg-red-50 text-red-700',
};

/* ─── MedicalSection ─── */

interface MedicalSectionProps {
  records: MedicalRecord[];
  canEdit: boolean;
  showForm: boolean;
  form: CreateMedicalRecordDto;
  onOpenForm: () => void;
  onCloseForm: () => void;
  onFormChange: (partial: Partial<CreateMedicalRecordDto>) => void;
  onSubmit: () => Promise<void>;
  onDelete: (id: string) => void;
  isPending: boolean;
}

function MedicalSection({ records, canEdit, showForm, form, onOpenForm, onCloseForm, onFormChange, onSubmit, onDelete, isPending }: MedicalSectionProps) {
  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none';
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:border-gray-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </span>
          <h2 className="text-base font-bold text-gray-900">
            Historial médico
            {records.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">({records.length})</span>
            )}
          </h2>
        </div>
        {canEdit && !showForm && (
          <button onClick={onOpenForm}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar
          </button>
        )}
      </div>

      {showForm && (
        <form className="mb-3 space-y-2 rounded-xl border border-green-100 bg-green-50 p-3"
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => onFormChange({ type: e.target.value as MedicalRecord['type'] })} className={inputCls}>
                <option value="vacuna">Vacuna</option>
                <option value="desparasitacion">Desparasitación</option>
                <option value="analisis">Análisis</option>
                <option value="tratamiento">Tratamiento</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => onFormChange({ date: e.target.value })} className={inputCls} required />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Nombre / producto</label>
            <input type="text" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} className={inputCls} placeholder="Ej: Triple viral, Ivermectina..." required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Próxima dosis</label>
              <input type="date" value={form.next_due ?? ''} onChange={(e) => onFormChange({ next_due: e.target.value || undefined })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Marca / lote</label>
              <input type="text" value={form.brand ?? ''} onChange={(e) => onFormChange({ brand: e.target.value || undefined })} className={inputCls} placeholder="Opcional" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notas</label>
            <textarea rows={2} value={form.notes ?? ''} onChange={(e) => onFormChange({ notes: e.target.value || undefined })} className={inputCls} placeholder="Observaciones adicionales" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCloseForm}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >Cancelar</button>
            <button type="submit" disabled={isPending}
              className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white disabled:opacity-50 transition cursor-pointer hover:bg-green-700"
            >{isPending ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {records.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400">Sin registros médicos. Agregá vacunas, desparasitaciones y tratamientos.</p>
      ) : (
        <div className="space-y-2">
          {records.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${medicalTypeBadge[rec.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {medicalTypeLabel[rec.type] ?? rec.type}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">{rec.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-gray-400">
                    {new Date(rec.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {canEdit && (
                    <button onClick={() => onDelete(rec.id)}
                      className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {(rec.next_due || rec.brand || rec.notes) && (
                <div className="mt-1.5 space-y-0.5 pl-1">
                  {rec.next_due && (
                    <p className="text-[10px] text-amber-600">
                      Próxima: {new Date(rec.next_due + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {rec.brand && <p className="text-[10px] text-gray-400">Marca/Lote: {rec.brand}{rec.batch ? ` · ${rec.batch}` : ''}</p>}
                  {rec.notes && <p className="text-[10px] text-gray-500 italic">{rec.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
  const { data: financial } = useFinancialSummary(id);
  const { data: propietarios } = usePropietarios();
  const { data: vets } = useHorseVets(id);
  const { data: veterinarios } = useVeterinarios();
  const assignVet = useAssignVet(id);
  const removeVet = useRemoveVet(id);
  const { data: documents } = useHorseDocuments(id);
  const uploadDoc = useUploadDocument(id);
  const deleteDoc = useDeleteDocument(id);
  const { data: weightRecords } = useWeightRecords(id);
  const addWeight = useAddWeightRecord(id);
  const deleteWeight = useDeleteWeightRecord(id);
  const { data: routines } = useRoutines(id, 7);
  const upsertRoutine = useUpsertRoutine(id);
  const { data: activityPhotos } = useActivityPhotos(id);
  const uploadActivityPhoto = useUploadActivityPhoto(id);
  const deleteActivityPhoto = useDeleteActivityPhoto(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const addMedical = useAddMedicalRecord(id);
  const deleteMedical = useDeleteMedicalRecord(id);
  const todayISO = new Date().toISOString().split('T')[0];
  const todayRoutine = routines?.find((r) => r.date === todayISO);
  const deleteHorse = useDeleteHorse();
  const deleteEvent = useDeleteEvent();
  const transferHorse = useTransferHorse();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [transferError, setTransferError] = useState('');
  const [showAssignVet, setShowAssignVet] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);
  const activityPhotoInputRef = useRef<HTMLInputElement>(null);
  const [activityPhotoType, setActivityPhotoType] = useState('otro');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newBodyCondition, setNewBodyCondition] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [showAddMedical, setShowAddMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<CreateMedicalRecordDto>({
    type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0],
  });

  const canEdit = can('horses', 'update');

  const ROUTINE_ITEMS = [
    { key: 'morning_feed',   label: 'Comida mañana' },
    { key: 'afternoon_feed', label: 'Comida tarde' },
    { key: 'evening_feed',   label: 'Comida noche' },
    { key: 'water_ok',       label: 'Agua' },
    { key: 'paddock',        label: 'Paddock' },
    { key: 'trained',        label: 'Entrenamiento' },
    { key: 'health_check',   label: 'Revisión salud' },
  ] as const;

  const canFillRoutine = ['establecimiento', 'veterinario', 'propietario', 'admin'].includes(user?.role ?? '');

  const toggleRoutineItem = (key: typeof ROUTINE_ITEMS[number]['key']) => {
    const current = todayRoutine?.[key] ?? false;
    upsertRoutine.mutate({ date: todayISO, [key]: !current });
  };
  const canDelete = can('horses', 'delete');
  const canCreateEvent = can('events', 'create');
  const canEditEvent = can('events', 'update');
  const canDeleteEvent = can('events', 'delete');
  const isOwner = horse && user && horse.owner_id === user.id;

  const handleShare = async () => {
    try {
      const { data } = await api.post(`/horses/${id}/share`);
      const link = `${window.location.origin}/historial/${data.token}`;
      await navigator.clipboard.writeText(link);
      alert(`Enlace copiado al portapapeles!\nVálido 72 horas.\n\n${link}`);
    } catch {
      alert('No se pudo generar el enlace.');
    }
  };

  const handleExportCSV = async () => {
    const token = localStorage.getItem('token');
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api');
    const url = `${baseUrl}/horses/${id}/expenses/export`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gastos-${horse?.name ?? id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleTransfer = async () => {
    if (!transferOwnerId) return;
    setTransferError('');
    try {
      await transferHorse.mutateAsync({ id, new_owner_id: transferOwnerId });
      setShowTransfer(false);
      setTransferOwnerId('');
    } catch {
      setTransferError('No se pudo transferir el caballo. Verificá que el propietario exista.');
    }
  };

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

  const infoItems: { label: string; value: string }[] = [];
  if (horse.birth_date) infoItems.push({ label: 'Nacimiento', value: `${formatDate(horse.birth_date)} (${calcAge(horse.birth_date)})` });
  if (horse.microchip) infoItems.push({ label: 'Microchip', value: horse.microchip });
  if (horse.owner) infoItems.push({ label: 'Propietario', value: horse.owner.name });
  if (horse.establishment) infoItems.push({ label: 'Establecimiento', value: horse.establishment.name });
  if (horse.breed) infoItems.push({ label: 'Raza', value: horse.breed.name });
  if (horse.activity) infoItems.push({ label: 'Actividad', value: horse.activity.name });
  infoItems.push({ label: 'Registrado', value: new Date(horse.created_at).toLocaleDateString('es-AR') });

  return (
    <div className="pb-8">

      {/* Confirmacion eliminar caballo */}
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

      {/* Modal editar evento */}
      {editingEvent && (
        <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}

      {/* Confirmar eliminar evento */}
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

      {/* Modal registrar peso */}
      {showAddWeight && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setShowAddWeight(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-orange-600 px-5 py-4">
                <p className="font-bold text-white">Registrar peso</p>
                <button onClick={() => setShowAddWeight(false)} className="text-white/70 hover:text-white cursor-pointer">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">Peso (kg) *</label>
                    <input type="number" step="0.1" min="1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="450.0"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">Condición (1-9)</label>
                    <input type="number" min="1" max="9" value={newBodyCondition} onChange={(e) => setNewBodyCondition(e.target.value)}
                      placeholder="5"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Fecha</label>
                  <input type="date" value={newWeightDate} onChange={(e) => setNewWeightDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Notas (opcional)</label>
                  <textarea rows={2} value={newWeightNotes} onChange={(e) => setNewWeightNotes(e.target.value)}
                    placeholder="Observaciones..."
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm resize-none focus:border-gray-400 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAddWeight(false)}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!newWeight) return;
                      await addWeight.mutateAsync({
                        weight_kg: newWeight,
                        body_condition: newBodyCondition ? parseInt(newBodyCondition) : undefined,
                        date: newWeightDate,
                        notes: newWeightNotes || undefined,
                      });
                      setNewWeight(''); setNewBodyCondition(''); setNewWeightNotes('');
                      setShowAddWeight(false);
                    }}
                    disabled={!newWeight || addWeight.isPending}
                    className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-orange-700 transition"
                  >
                    {addWeight.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* Modal asignar veterinario */}
      {showAssignVet && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setShowAssignVet(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-teal-600 px-5 py-4">
                <p className="font-bold text-white">Asignar veterinario</p>
                <button onClick={() => setShowAssignVet(false)} className="text-white/70 hover:text-white cursor-pointer">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Seleccioná el veterinario que tendrá acceso a los registros de <strong>{horse?.name}</strong>.
                </p>
                {!veterinarios?.length ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No hay veterinarios registrados en el sistema.
                  </p>
                ) : (
                  <select
                    value={selectedVetId}
                    onChange={(e) => setSelectedVetId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                  >
                    <option value="">Seleccionar veterinario...</option>
                    {veterinarios
                      .filter((v) => !vets?.some((assigned) => assigned.user_id === v.id))
                      .map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))
                    }
                  </select>
                )}
                {assignVet.isError && (
                  <p className="text-xs text-red-500">No se pudo asignar el veterinario.</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAssignVet(false)}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedVetId) return;
                      await assignVet.mutateAsync(selectedVetId);
                      setShowAssignVet(false);
                      setSelectedVetId('');
                    }}
                    disabled={!selectedVetId || assignVet.isPending}
                    className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-teal-700 transition"
                  >
                    {assignVet.isPending ? 'Asignando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* Modal transferir propiedad */}
      {showTransfer && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setShowTransfer(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-amber-600 px-5 py-4">
                <p className="font-bold text-white">Transferir {horse?.name}</p>
                <button onClick={() => setShowTransfer(false)} className="text-white/70 hover:text-white cursor-pointer">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Seleccioná el nuevo propietario. Esta acción es irreversible y quedará registrada en el historial.
                </p>
                <select
                  value={transferOwnerId}
                  onChange={(e) => setTransferOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                >
                  <option value="">Seleccionar propietario...</option>
                  {propietarios?.filter((p) => p.id !== horse?.owner_id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.email}</option>
                  ))}
                </select>
                {transferError && <p className="text-xs text-red-500">{transferError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowTransfer(false)}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button type="button" onClick={handleTransfer} disabled={!transferOwnerId || transferHorse.isPending}
                    className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-amber-700 transition"
                  >
                    {transferHorse.isPending ? 'Transfiriendo...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* ─── Back link ─── */}
      <Link
        href="/caballos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Caballos
      </Link>

      {/* ─── MOBILE LAYOUT (lg:hidden) ─── */}
      <div className="lg:hidden space-y-5">

        {/* Imagen panorámica top */}
        <div className="relative -mx-4 aspect-[4/3] overflow-hidden bg-gray-900">
          {horse.image_url ? (
            <img
              src={cldTransform(horse.image_url, { width: 800, ar: '4:3' })}
              alt={horse.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Card flotante con datos del caballo (overlap con la imagen) */}
        <div className="relative -mt-12 rounded-3xl border border-gray-100 bg-white p-5 shadow-xl">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{horse.name}</h1>
          {(horse.breed || horse.activity) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {horse.breed && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
                  {horse.breed.name}
                </span>
              )}
              {horse.activity && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                  {horse.activity.name}
                </span>
              )}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {infoItems.map((item) => (
              <InfoItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          {(canEdit || canDelete || isOwner) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {canEdit && (
                <Link
                  href="/caballos"
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-700 transition hover:border-[#0f1f3d] hover:text-[#0f1f3d]"
                >
                  Editar
                </Link>
              )}
              {isOwner && (
                <button
                  onClick={() => setShowTransfer(true)}
                  className="flex-1 rounded-xl border border-amber-100 py-2.5 text-xs font-semibold text-amber-600 transition hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  Transferir
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex-1 rounded-xl border border-blue-100 py-2.5 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
              >
                Compartir
              </button>
              {canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex-1 rounded-xl border border-red-100 py-2.5 text-xs font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50 cursor-pointer"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tenencia */}
        {ownership && ownership.length > 0 && (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Tenencia</h2>
            </div>
            <div className="space-y-1.5">
              {ownership.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
                  <span className="text-sm font-medium text-gray-700">{o.user?.name ?? 'Sin nombre'}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {o.percentage != null ? `${Number(o.percentage)}%` : '--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Veterinarios (mobile) */}
        {(isOwner || user?.role === 'admin') && (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </span>
                <h2 className="text-base font-bold text-gray-900">Veterinarios</h2>
                {vets && vets.length > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{vets.length}</span>
                )}
              </div>
              <button
                onClick={() => { setSelectedVetId(''); setShowAssignVet(true); }}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Asignar
              </button>
            </div>
            {!vets?.length ? (
              <p className="text-xs text-gray-400">Sin veterinarios asignados</p>
            ) : (
              <div className="space-y-1.5">
                {vets.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{v.user?.name}</p>
                      <p className="text-xs text-gray-400">{v.user?.email}</p>
                    </div>
                    <button
                      onClick={() => removeVet.mutate(v.user_id)}
                      className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                      title="Quitar veterinario"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Peso y condición corporal (mobile) */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Peso y condición</h2>
            </div>
            {canEdit && (
              <button onClick={() => setShowAddWeight(true)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Registrar
              </button>
            )}
          </div>

          {!weightRecords?.length ? (
            <p className="text-xs text-gray-400">Sin registros de peso</p>
          ) : (
            <div className="space-y-2">
              {/* Último peso destacado */}
              <div className="rounded-xl bg-orange-50 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">Último registro</p>
                  <p className="text-2xl font-bold text-orange-900">{Number(weightRecords[0].weight_kg)} kg</p>
                  {weightRecords[0].body_condition && (
                    <p className="text-xs text-orange-600">CC: {weightRecords[0].body_condition}/9</p>
                  )}
                </div>
                <p className="text-xs text-orange-400">
                  {new Date(weightRecords[0].date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              {/* Historial */}
              {weightRecords.slice(1).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{Number(r.weight_kg)} kg</p>
                    {r.body_condition && <p className="text-xs text-gray-400">CC: {r.body_condition}/9</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {canEdit && (
                      <button onClick={() => deleteWeight.mutate(r.id)} className="text-gray-300 hover:text-red-400 transition cursor-pointer">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentos (mobile) */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Documentos</h2>
              {documents && documents.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{documents.length}</span>
              )}
            </div>
            {canEdit && (
              <>
                <input ref={docInputRef} type="file" accept=".pdf,image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await uploadDoc.mutateAsync({ file, name: file.name });
                    e.target.value = '';
                  }}
                />
                <button onClick={() => docInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Subir
                </button>
              </>
            )}
          </div>
          {!documents?.length ? (
            <p className="text-xs text-gray-400">Sin documentos adjuntos</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-70 transition"
                  >
                    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 truncate">{doc.name}</span>
                  </a>
                  {canEdit && (
                    <button onClick={() => deleteDoc.mutate(doc.id)}
                      className="ml-2 shrink-0 rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen financiero (mobile) */}
        {financial && (financial.total > 0 || financial.monthly.length > 0) && (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Resumen financiero</h2>
              </div>
              <button onClick={handleExportCSV}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                title="Exportar CSV"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-purple-50 p-3">
                <p className="text-[11px] font-medium text-purple-500 uppercase tracking-wide">Total gastos</p>
                <p className="mt-0.5 text-lg font-bold text-purple-900">${financial.total.toLocaleString('es-AR')}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Promedio/mes</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900">${financial.average_monthly.toLocaleString('es-AR')}</p>
              </div>
            </div>
            {financial.monthly.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Últimos meses</p>
                {financial.monthly.slice(0, 6).map((m) => {
                  const [year, month] = m.month.split('-');
                  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
                  const maxVal = Math.max(...financial.monthly.slice(0, 6).map((x) => x.total));
                  return (
                    <div key={m.month} className="flex items-center gap-2">
                      <span className="w-12 text-right text-[11px] text-gray-400">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-400" style={{ width: `${maxVal > 0 ? (m.total / maxVal) * 100 : 0}%` }} />
                      </div>
                      <span className="w-20 text-right text-[11px] font-medium text-gray-700">${m.total.toLocaleString('es-AR')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rutina diaria (mobile) */}
        {canFillRoutine && (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Rutina de hoy</h2>
                <p className="text-[11px] text-gray-400">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROUTINE_ITEMS.map(({ key, label }) => {
                const checked = todayRoutine?.[key] ?? false;
                return (
                  <button key={key} onClick={() => toggleRoutineItem(key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition cursor-pointer ${
                      checked ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      checked ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {checked && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Historial de eventos */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Historial</h2>
              {sortedEvents.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                  {sortedEvents.length}
                </span>
              )}
            </div>
            {canCreateEvent && (
              <button
                onClick={() => setShowCreateEvent(true)}
                className="flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-semibold text-white shadow-sm cursor-pointer"
                style={{ backgroundColor: '#0f1f3d' }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
                Nuevo
              </button>
            )}
          </div>

          {sortedEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
              <p className="text-sm font-medium text-gray-500">Sin eventos registrados</p>
              <p className="mt-1 text-xs text-gray-400">Creá el primer evento del caballo</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onEdit={canEditEvent ? setEditingEvent : undefined}
                  onDelete={canDeleteEvent ? setDeletingEventId : undefined}
                  canEditMetrics={canEditEvent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Fotos de actividad (mobile) */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Fotos verificadas</h2>
              {activityPhotos && activityPhotos.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{activityPhotos.length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select value={activityPhotoType} onChange={(e) => setActivityPhotoType(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none"
              >
                {Object.entries(ACTIVITY_TYPES).map(([v, m]) => (
                  <option key={v} value={v}>{m.label}</option>
                ))}
              </select>
              <input ref={activityPhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await uploadActivityPhoto.mutateAsync({ file, activity_type: activityPhotoType });
                  e.target.value = '';
                }}
              />
              <button onClick={() => activityPhotoInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Foto
              </button>
            </div>
          </div>

          {!activityPhotos?.length ? (
            <p className="text-xs text-gray-400">Sin fotos de actividad. Las fotos tomadas con el botón incluyen un sello de fecha y autor.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {activityPhotos.map((p) => {
                const meta = ACTIVITY_TYPES[p.activity_type] ?? ACTIVITY_TYPES.otro;
                return (
                  <div key={p.id} className="relative group">
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <img src={p.url} alt={meta.label} className="h-24 w-full rounded-xl object-cover" />
                    </a>
                    <div className="absolute top-1 left-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    <button onClick={() => deleteActivityPhoto.mutate(p.id)}
                      className="absolute top-1 right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white cursor-pointer"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="mt-0.5 text-[9px] text-gray-400 text-center">
                      {new Date(p.taken_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historial médico (mobile) */}
        <MedicalSection
          records={medicalRecords ?? []}
          canEdit={canEdit}
          showForm={showAddMedical}
          form={medicalForm}
          onOpenForm={() => setShowAddMedical(true)}
          onCloseForm={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0] }); }}
          onFormChange={(f) => setMedicalForm((prev) => ({ ...prev, ...f }))}
          onSubmit={async () => { await addMedical.mutateAsync(medicalForm); setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0] }); }}
          onDelete={(rid) => deleteMedical.mutate(rid)}
          isPending={addMedical.isPending}
        />

      </div>

      {/* ─── DESKTOP LAYOUT (lg+) ─── */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start">

        {/* ─── Col izquierda: imagen + info ─── */}
        <div className="lg:sticky lg:top-6 space-y-4 mb-6 lg:mb-0">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

            {/* Imagen con overlay mobile */}
            <div className="relative aspect-[4/3] bg-gray-100">
              {horse.image_url ? (
                <img src={horse.image_url} alt={horse.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {/* Gradient overlay + nombre (mobile) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
              <div className="absolute bottom-0 left-0 right-0 p-4 lg:hidden">
                <h1 className="text-lg font-bold text-white">{horse.name}</h1>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {horse.breed && (
                    <span className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-white">
                      {horse.breed.name}
                    </span>
                  )}
                  {horse.activity && (
                    <span className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-white">
                      {horse.activity.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Nombre + badges (desktop only) */}
            <div className="hidden lg:block p-4 pb-2">
              <h1 className="text-lg font-bold text-gray-900">{horse.name}</h1>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
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
            </div>

            {/* Info grid */}
            <div className="p-4 pt-3">
              <div className="grid grid-cols-2 gap-2">
                {infoItems.map((item) => (
                  <InfoItem key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>

            {/* Acciones */}
            {(canEdit || canDelete || isOwner) && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
                {canEdit && (
                  <Link
                    href="/caballos"
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-xs font-medium text-gray-700 transition hover:border-[#0f1f3d] hover:text-[#0f1f3d]"
                  >
                    Editar
                  </Link>
                )}
                {isOwner && (
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="flex-1 rounded-lg border border-amber-100 py-2 text-xs font-medium text-amber-600 transition hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                  >
                    Transferir
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex-1 rounded-lg border border-red-100 py-2 text-xs font-medium text-red-500 transition hover:border-red-300 hover:bg-red-50 cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─── Tenencia ─── */}
          {ownership && ownership.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2.5 text-sm font-semibold text-gray-900">Tenencia</h2>
              <div className="space-y-1.5">
                {ownership.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-700">{o.user?.name ?? 'Sin nombre'}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {o.percentage != null ? `${Number(o.percentage)}%` : '--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Veterinarios (desktop) ─── */}
          {(isOwner || user?.role === 'admin') && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Veterinarios</h2>
                <button
                  onClick={() => { setSelectedVetId(''); setShowAssignVet(true); }}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Asignar
                </button>
              </div>
              {!vets?.length ? (
                <p className="text-xs text-gray-400">Sin veterinarios asignados</p>
              ) : (
                <div className="space-y-1.5">
                  {vets.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm text-gray-700">{v.user?.name}</p>
                        <p className="text-xs text-gray-400">{v.user?.email}</p>
                      </div>
                      <button
                        onClick={() => removeVet.mutate(v.user_id)}
                        className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                        title="Quitar"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Documentos (desktop) ─── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Documentos
                {documents && documents.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">({documents.length})</span>
                )}
              </h2>
              {canEdit && (
                <button onClick={() => docInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Subir
                </button>
              )}
            </div>
            {!documents?.length ? (
              <p className="text-xs text-gray-400">Sin documentos adjuntos</p>
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-70 transition"
                    >
                      <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                    </a>
                    {canEdit && (
                      <button onClick={() => deleteDoc.mutate(doc.id)}
                        className="ml-1 shrink-0 rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Resumen financiero (desktop) ─── */}
          {financial && (financial.total > 0 || financial.monthly.length > 0) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Resumen financiero</h2>
                <button onClick={handleExportCSV}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  CSV
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-purple-50 p-3">
                  <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wide">Total</p>
                  <p className="mt-0.5 text-base font-bold text-purple-900">${financial.total.toLocaleString('es-AR')}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Prom/mes</p>
                  <p className="mt-0.5 text-base font-bold text-gray-900">${financial.average_monthly.toLocaleString('es-AR')}</p>
                </div>
              </div>
              {financial.monthly.length > 0 && (
                <div className="space-y-1.5">
                  {financial.monthly.slice(0, 5).map((m) => {
                    const [year, month] = m.month.split('-');
                    const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
                    const maxVal = Math.max(...financial.monthly.slice(0, 5).map((x) => x.total));
                    return (
                      <div key={m.month} className="flex items-center gap-2">
                        <span className="w-10 text-right text-[10px] text-gray-400">{label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-purple-400" style={{ width: `${maxVal > 0 ? (m.total / maxVal) * 100 : 0}%` }} />
                        </div>
                        <span className="w-16 text-right text-[10px] font-medium text-gray-600">${m.total.toLocaleString('es-AR')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Col derecha: peso + eventos ─── */}
        <div className="space-y-4">

        {/* Peso (desktop) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Peso y condición corporal</h2>
            {canEdit && (
              <button onClick={() => setShowAddWeight(true)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Registrar
              </button>
            )}
          </div>
          {!weightRecords?.length ? (
            <p className="text-xs text-gray-400">Sin registros de peso</p>
          ) : (
            <div className="space-y-1.5">
              <div className="rounded-xl bg-orange-50 px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-orange-900">{Number(weightRecords[0].weight_kg)} kg</p>
                  {weightRecords[0].body_condition && <p className="text-[10px] text-orange-500">CC: {weightRecords[0].body_condition}/9</p>}
                </div>
                <p className="text-[10px] text-orange-400">
                  {new Date(weightRecords[0].date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {weightRecords.slice(1, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{Number(r.weight_kg)} kg{r.body_condition ? ` · CC ${r.body_condition}/9` : ''}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {canEdit && (
                      <button onClick={() => deleteWeight.mutate(r.id)} className="text-gray-300 hover:text-red-400 transition cursor-pointer">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rutina diaria (desktop) */}
        {canFillRoutine && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Rutina de hoy</h2>
              <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ROUTINE_ITEMS.map(({ key, label }) => {
                const checked = todayRoutine?.[key] ?? false;
                return (
                  <button key={key} onClick={() => toggleRoutineItem(key)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition cursor-pointer ${
                      checked ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      checked ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {checked && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Eventos (desktop) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
                <EventCard
                  key={ev.id}
                  event={ev}
                  onEdit={canEditEvent ? setEditingEvent : undefined}
                  onDelete={canDeleteEvent ? setDeletingEventId : undefined}
                  canEditMetrics={canEditEvent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Historial médico (desktop) */}
        <MedicalSection
          records={medicalRecords ?? []}
          canEdit={canEdit}
          showForm={showAddMedical}
          form={medicalForm}
          onOpenForm={() => setShowAddMedical(true)}
          onCloseForm={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0] }); }}
          onFormChange={(f) => setMedicalForm((prev) => ({ ...prev, ...f }))}
          onSubmit={async () => { await addMedical.mutateAsync(medicalForm); setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0] }); }}
          onDelete={(rid) => deleteMedical.mutate(rid)}
          isPending={addMedical.isPending}
        />

        </div>{/* cierre space-y-4 col derecha */}
      </div>{/* cierre grid desktop */}
    </div>
  );
}
