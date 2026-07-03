'use client';

import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useHorse, useHorseOwnership, useDeleteHorse, useTransferHorse, usePropietarios, useHorseVets, useAssignVet, useRemoveVet, useVeterinarios, useHorseAssignees, useHorseOrgMembers, useAssignMember, useRemoveMember, useHorseDocuments, useUploadDocument, useDeleteDocument, useWeightRecords, useAddWeightRecord, useDeleteWeightRecord, useHorseMovements, type HorseMovement } from '@/hooks/use-horses';
import { useEventsByHorse, useCreateEvent, useUpdateEvent, useDeleteEvent, useShareEvent } from '@/hooks/use-events';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { useRoutines, useUpsertRoutine, type DailyRoutine } from '@/hooks/use-routines';
import { useActivityPhotos, useUploadActivityPhoto, useDeleteActivityPhoto, ACTIVITY_TYPES } from '@/hooks/use-activity-photos';
import { useMedicalRecords, useAddMedicalRecord, useDeleteMedicalRecord, useDownloadMedicalPdf, useDownloadHealthCertificate, type MedicalRecord, type CreateMedicalRecordDto } from '@/hooks/use-medical';
import { usePlanStatus } from '@/hooks/use-plan';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '@/hooks/use-event-comments';
import { useCreateBoardingRequest, useBoardingRequests } from '@/hooks/use-boarding-requests';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { TrainingMetricsPanel } from '@/components/training-metrics-panel';
import PedigreeSection from '@/components/pedigree/PedigreeSection';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import ConfirmDialog from '@/components/confirm-dialog';
import ImagePicker from '@/components/image-picker';
import { cldTransform } from '@/lib/cloudinary';
import { calcAge, formatDate as fmtDate } from '@/lib/utils';
import { formatMoney } from '@/lib/currency';
import { X, Syringe, Home, DoorOpen, RefreshCw, ClipboardList, ShieldCheck, AlertTriangle, XCircle, Lock, CalendarClock, Wheat, Hammer, Activity, Wrench, Truck, Package, Banknote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HorseHead } from '@/components/icons/equine';
import { HorseVerifiedBadge } from '@/components/ui/verified-badge';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import type { Event } from '@/types';

/* ─── Constants ─── */

// Base URL usada para los enlaces públicos (QR, compartir).
// Configurable via NEXT_PUBLIC_PUBLIC_BASE_URL (ej. IP LAN http://192.168.x.x:3005)
// para que el QR sea accesible desde otros dispositivos. Sin la env usa el origin actual.
const PUBLIC_BASE = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const typeBadge: Record<string, { label: string; cls: string }> = {
  salud:         { label: 'Salud',         cls: 'bg-red-50 text-red-700' },
  entrenamiento: { label: 'Entrenamiento', cls: 'bg-yellow-50 text-yellow-700' },
  gasto:         { label: 'Gasto',         cls: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300' },
  nota:          { label: 'Nota',          cls: 'bg-gray-100 text-gray-700' },
  carrera:       { label: 'Carrera',       cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  tarea:         { label: 'Tarea',         cls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  aviso:         { label: 'Aviso',         cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
};

const orgRoleLabel: Record<string, string> = {
  jinete: 'Jinete',
  peon: 'Peón',
  encargado: 'Encargado',
};

const typeOptions = [
  { value: 'salud', label: 'Salud' },
  { value: 'entrenamiento', label: 'Entrenamiento' },
  { value: 'gasto', label: 'Gasto' },
  { value: 'nota', label: 'Nota' },
  { value: 'carrera', label: 'Carrera' },
];

const inputClass =
  'w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm text-gray-900 transition focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10';

const EXPENSE_CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'alimentacion',  label: 'Alimentación', Icon: Wheat },
  { value: 'veterinario',   label: 'Veterinario',  Icon: Syringe },
  { value: 'herradero',     label: 'Herradero',    Icon: Hammer },
  { value: 'entrenamiento', label: 'Entrenamiento',Icon: Activity },
  { value: 'mantenimiento', label: 'Mantenimiento',Icon: Wrench },
  { value: 'transporte',    label: 'Transporte',   Icon: Truck },
  { value: 'otros',         label: 'Otros',        Icon: Package },
];

const CATEGORY_COLORS: Record<string, string> = {
  alimentacion:  '#15803d',
  veterinario:   '#b91c1c',
  herradero:     '#b45309',
  entrenamiento: '#9d6c35',
  mantenimiento: '#57534e',
  transporte:    '#7c6f5b',
  otros:         '#6b7280',
};

/* ─── Helpers ─── */

function formatDate(date: string): string {
  return fmtDate(date, {
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
  const [expenseCategory, setExpenseCategory] = useState((event as unknown as { expense_category?: string }).expense_category ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateEvent.mutateAsync({
      id: event.id,
      type,
      description,
      date,
      amount: type === 'gasto' && amount ? amount : undefined,
      expense_category: type === 'gasto' && expenseCategory ? expenseCategory : undefined,
    });
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none';

  const formContent = (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {typeOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={`rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                type === opt.value ? 'border-[var(--color-primary)] bg-clay-500 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Monto ($)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setExpenseCategory(cat.value)}
                  className={`rounded-lg border py-1.5 text-[11px] font-medium transition cursor-pointer ${
                    expenseCategory === cat.value ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1"><cat.Icon size={13} /> {cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
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
          className="flex-1 rounded-lg bg-clay-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
        >
          {updateEvent.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999] flex flex-col bg-[var(--surface-card)] sm:hidden">
        <div className="flex items-center justify-between bg-clay-500 px-5 py-4">
          <p className="font-bold text-white">Editar evento</p>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{formContent}</div>
      </div>
      <div className="fixed inset-0 z-[998] hidden sm:block bg-[var(--overlay)]" onClick={onClose} />
      <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center p-4">
        <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-[var(--surface-card)] shadow-2xl overflow-hidden" style={{ maxHeight: '88dvh' }}>
          <div className="flex items-center justify-between rounded-t-2xl bg-clay-500 px-6 py-4">
            <p className="font-bold text-white">Editar evento</p>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
          <div className="overflow-y-auto flex-1">{formContent}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ─── Event Card ─── */

function EventCommentThread({ eventId, currentUserId }: { eventId: string; currentUserId?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition cursor-pointer"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
        {open ? 'Ocultar' : 'Comentarios'}{comments && comments.length > 0 ? ` (${comments.length})` : ''}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-1.5 group">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">
                {c.user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-gray-600">{c.user?.name}</span>
                <span className="ml-1 text-[10px] text-gray-400">
                  {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="text-xs text-gray-700 break-words">{c.text}</p>
              </div>
              {(c.user_id === currentUserId) && (
                <button onClick={() => del.mutate(c.id)}
                  className="hidden group-hover:flex shrink-0 rounded p-0.5 text-gray-300 hover:text-red-400 cursor-pointer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <form className="flex gap-1.5 mt-2"
            onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; await add.mutateAsync(text.trim()); setText(''); }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribí un comentario..."
              className="flex-1 rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-2.5 py-1.5 text-xs focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
            />
            <button type="submit" disabled={!text.trim() || add.isPending}
              className="rounded-lg bg-clay-500 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 cursor-pointer"
            >
              {add.isPending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onEdit,
  onDelete,
  onShare,
  onTogglePublic,
  canEditMetrics,
  currentUserId,
}: {
  event: Event;
  onEdit?: (e: Event) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onTogglePublic?: (id: string, val: boolean) => void;
  canEditMetrics?: boolean;
  currentUserId?: string;
}) {
  const badge = typeBadge[event.type] ?? typeBadge.nota;
  const hasMedia = (event.photos?.length ?? 0) > 0;
  return (
    <div className="rounded-xl border border-gray-100 bg-[var(--surface-card)] p-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
          {event.is_public && (
            <span className="rounded-full bg-clay-500/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">Público</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-400">{formatDate(event.date)}</span>
          {onShare && hasMedia && (
            <button onClick={() => onShare(event.id)}
              className="rounded-md p-1 text-gray-300 hover:bg-clay-500/10 hover:text-clay-500 transition cursor-pointer"
              title={event.feed_post_id ? 'Ya compartido' : 'Compartir al feed'}
              disabled={!!event.feed_post_id}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </button>
          )}
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
        <p className="mt-1 text-sm font-semibold text-purple-700 dark:text-purple-300">
          {formatMoney(Number(event.amount), event.currency)}
        </p>
      )}
      {event.photos && event.photos.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {event.photos.map((p) => p.file_type === 'video' ? (
            <div key={p.id} className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-zinc-900">
              <video src={p.url} className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          ) : (
            <img key={p.id} src={p.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
          ))}
        </div>
      )}
      {/* Hora / recurrencia */}
      {(event.event_time || (event.recurrence_type && event.recurrence_type !== 'none')) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {event.event_time && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              {event.event_time}
            </span>
          )}
          {event.recurrence_type && event.recurrence_type !== 'none' && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
              {{ daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' }[event.recurrence_type]}
            </span>
          )}
        </div>
      )}
      {event.type === 'entrenamiento' && (
        <TrainingMetricsPanel eventId={event.id} canEdit={canEditMetrics ?? false} />
      )}
      {/* Toggle publicar (solo propietario) */}
      {onTogglePublic && (
        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="text-[11px] text-gray-400">{event.is_public ? 'Visible en perfil público' : 'Solo para vos'}</span>
          <button
            type="button"
            onClick={() => onTogglePublic(event.id, !event.is_public)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              event.is_public ? 'bg-clay-500' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${event.is_public ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      )}
      <EventCommentThread eventId={event.id} currentUserId={currentUserId} />
    </div>
  );
}

/* ─── Create Event Modal ─── */

type EventMode = 'now' | 'scheduled' | 'recurring';

const RECURRENCE_OPTIONS = [
  { value: 'daily',    label: 'Cada día' },
  { value: 'weekly',   label: 'Cada semana' },
  { value: 'biweekly', label: 'Cada 2 semanas' },
  { value: 'monthly',  label: 'Cada mes' },
];

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
  const [mode, setMode] = useState<EventMode>('now');
  const [type, setType] = useState('salud');
  const [description, setDescription] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [eventTime, setEventTime] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  });
  const [amount, setAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError('La descripción es obligatoria'); return; }
    if (mode === 'recurring' && !recurrenceEnd) { setError('Seleccioná hasta cuándo se repite'); return; }
    setError('');
    await createEvent.mutateAsync({
      type,
      description,
      date: mode === 'now' ? today : date,
      horse_id: horseId,
      amount: type === 'gasto' && amount ? amount : undefined,
      expense_category: type === 'gasto' && expenseCategory ? expenseCategory : undefined,
      is_public: isPublic,
      event_time: mode !== 'now' ? eventTime : undefined,
      recurrence_type: mode === 'recurring' ? recurrenceType : undefined,
      recurrence_end: mode === 'recurring' ? recurrenceEnd : undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
    onClose();
  };

  const modeBtn = (m: EventMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition cursor-pointer ${
        mode === m ? 'border-[var(--color-primary)] bg-clay-500 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const formContent = (
    <div className="space-y-4">
      {/* Modo */}
      <div className="flex gap-2">
        {modeBtn('now', 'Ahora',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
        )}
        {modeBtn('scheduled', 'Programar',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        )}
        {modeBtn('recurring', 'Repetir',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        )}
      </div>

      {/* Modo NOW: hint de cámara */}
      {mode === 'now' && (
        <div className="rounded-xl bg-clay-500/10 border border-clay-500/20 px-3 py-2.5 text-xs text-[var(--color-primary)]">
          Se registrará con la fecha y hora actuales. Podés adjuntar una foto tomada en el momento.
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Tipo</label>
        <div className="grid grid-cols-4 gap-2">
          {typeOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={`rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                type === opt.value ? 'border-[var(--color-primary)] bg-clay-500 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={3} className={inputClass} placeholder="Detalle del evento..." />
      </div>

      {/* Fecha + Hora (scheduled / recurring) */}
      {mode !== 'now' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Hora</label>
            <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className={inputClass} />
          </div>
        </div>
      )}

      {/* Recurrencia */}
      {mode === 'recurring' && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 dark:bg-amber-500/10 p-3 space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wide">Frecuencia</label>
            <div className="grid grid-cols-2 gap-2">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setRecurrenceType(opt.value)}
                  className={`rounded-lg border py-2 text-xs font-medium transition cursor-pointer ${
                    recurrenceType === opt.value ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-[var(--surface-card)] text-amber-700 hover:border-amber-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wide">Repetir hasta</label>
            <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)}
              min={date} className={inputClass} />
          </div>
        </div>
      )}

      {/* Monto + Categoría */}
      {type === 'gasto' && (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Monto</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setExpenseCategory(cat.value)}
                  className={`rounded-lg border py-1.5 text-[11px] font-medium transition cursor-pointer ${
                    expenseCategory === cat.value ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1"><cat.Icon size={13} /> {cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Fotos */}
      <ImagePicker files={photos} onChange={setPhotos} label="Fotos (opcional)" />

      {/* Publicar */}
      <button type="button" onClick={() => setIsPublic((p) => !p)}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition cursor-pointer ${
          isPublic ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isPublic ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
          {isPublic && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
        </span>
        Publicar en el perfil público del caballo
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {createEvent.isError && <p className="text-xs text-red-500">Error al crear el evento</p>}
    </div>
  );

  const submitLabel = mode === 'recurring'
    ? (createEvent.isPending ? 'Creando...' : 'Crear serie')
    : (createEvent.isPending ? 'Creando...' : 'Crear evento');

  return createPortal(
    <>
      {/* Mobile */}
      <div className="fixed inset-0 z-[999] flex flex-col bg-[var(--surface-card)] sm:hidden">
        <div className="flex items-center justify-between bg-clay-500 px-5 py-4">
          <div>
            <p className="font-bold text-white">Nuevo evento</p>
            <p className="text-xs text-white/50">{horseName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">{formContent}</div>
          <div className="border-t border-gray-100 p-5 space-y-3">
            <button type="submit" disabled={createEvent.isPending}
              className="w-full rounded-xl bg-clay-500 py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            >{submitLabel}</button>
            <button type="button" onClick={onClose}
              className="w-full rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 cursor-pointer"
            >Cancelar</button>
          </div>
        </form>
      </div>

      {/* Desktop */}
      <div className="fixed inset-0 z-[998] hidden sm:block bg-[var(--overlay)]" onClick={onClose} />
      <div className="fixed inset-0 z-[999] hidden sm:flex items-center justify-center p-4">
        <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-[var(--surface-card)] shadow-2xl overflow-hidden" style={{ maxHeight: '88dvh' }}>
          <div className="flex items-center justify-between rounded-t-2xl bg-clay-500 px-6 py-4">
            <div>
              <p className="font-bold text-white">Nuevo evento</p>
              <p className="text-xs text-white/50">{horseName}</p>
            </div>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto p-6">{formContent}</div>
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <button type="submit" disabled={createEvent.isPending}
                className="flex-1 rounded-lg bg-clay-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
              >{submitLabel}</button>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 cursor-pointer"
              >Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ─── Movement Row ─── */

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
  created: <HorseHead size={16} />,
  transfer_ownership: <RefreshCw className="h-4 w-4" />,
  establishment_in: <Home className="h-4 w-4" />,
  establishment_out: <DoorOpen className="h-4 w-4" />,
  vet_assigned: <Syringe className="h-4 w-4" />,
  vet_removed: <X className="h-4 w-4" />,
};

function MovementRow({ movement }: { movement: HorseMovement }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        {MOVEMENT_ICONS[movement.type] ?? <ClipboardList className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-800">{movement.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {movement.actor && <span className="text-[10px] text-gray-400">{movement.actor.name}</span>}
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400">
            {new Date(movement.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Medical Labels ─── */

const medicalTypeLabel: Record<string, string> = {
  vacuna: 'Vacuna', desparasitacion: 'Desparasitación', analisis: 'Análisis', tratamiento: 'Tratamiento', sanidad: 'Sanidad',
};
const medicalTypeBadge: Record<string, string> = {
  vacuna: 'bg-green-50 text-green-700', desparasitacion: 'bg-orange-50 text-orange-700',
  analisis: 'bg-blue-50 text-blue-700', tratamiento: 'bg-red-50 text-red-700',
  sanidad: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
};

/* ─── Libreta sanitaria (semáforo) ─── */

const SANITARY_DISEASES: { key: string; name: string; validityDays: number; match: RegExp }[] = [
  { key: 'aie',              name: 'AIE',              validityDays: 60,  match: /aie|anemia|coggins/i },
  { key: 'encefalomielitis', name: 'Encefalomielitis', validityDays: 365, match: /encefalo/i },
  { key: 'influenza',        name: 'Influenza',         validityDays: 90,  match: /influenza|gripe/i },
];

type HealthStatus = 'verde' | 'amarillo' | 'rojo';

function healthStatusFromNextDue(nextDue: string | null | undefined): HealthStatus {
  if (!nextDue) return 'rojo';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue + 'T00:00:00');
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'rojo';
  if (diffDays <= 15) return 'amarillo';
  return 'verde';
}

const HEALTH_STATUS_STYLE: Record<HealthStatus, {
  accent: string; iconWrap: string; badge: string; label: string; Icon: typeof ShieldCheck;
}> = {
  verde: {
    accent: 'bg-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    label: 'Vigente', Icon: ShieldCheck,
  },
  amarillo: {
    accent: 'bg-amber-500',
    iconWrap: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    label: 'Por vencer', Icon: AlertTriangle,
  },
  rojo: {
    accent: 'bg-red-500',
    iconWrap: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    label: 'Vencido', Icon: XCircle,
  },
};

function HealthBook({ records, canEdit, onCertify }: {
  records: MedicalRecord[];
  canEdit: boolean;
  onCertify: (diseaseName: string) => void;
}) {
  const sanidad = records.filter((r) => r.type === 'sanidad');
  const rows = SANITARY_DISEASES.map((d) => {
    const last = sanidad.find((r) => d.match.test(r.name)) ?? null;
    const nextDue = last?.next_due ?? null;
    return { ...d, last, nextDue, status: healthStatusFromNextDue(nextDue) };
  });

  const fmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-page)]">
      <div className="flex items-center gap-2 border-b border-[var(--surface-card-border)] px-3.5 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Libreta sanitaria</h3>
      </div>
      <div className="space-y-2 p-3">
        {rows.map((row) => {
          const st = HEALTH_STATUS_STYLE[row.status];
          const StatusIcon = st.Icon;
          return (
            <div key={row.key} className="relative flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] py-2 pl-4 pr-2.5">
              <span className={`absolute inset-y-0 left-0 w-1.5 ${st.accent}`} aria-hidden />
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.iconWrap}`}>
                  <StatusIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    {row.nextDue
                      ? row.status === 'rojo'
                        ? `Venció el ${fmt(row.nextDue)}`
                        : `Vence el ${fmt(row.nextDue)}`
                      : 'Sin registro'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.accent}`} />
                  {st.label}
                </span>
                {canEdit && (
                  <button onClick={() => onCertify(row.name)}
                    className="rounded-lg border border-[var(--color-primary)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)] hover:bg-clay-500 hover:text-white transition cursor-pointer"
                  >Certificar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  onCertify: (diseaseName: string) => void;
  isPending: boolean;
  horseId: string;
  horseName: string;
}

function MedicalSection({ records, canEdit, showForm, form, onOpenForm, onCloseForm, onFormChange, onSubmit, onDelete, onCertify, isPending, horseId, horseName }: MedicalSectionProps) {
  const { download: downloadPdf, loading: pdfLoading } = useDownloadMedicalPdf(horseId, horseName);
  const { download: downloadCert, loading: certLoading } = useDownloadHealthCertificate(horseId, horseName);
  const { user } = useAuth();
  const { data: planStatus } = usePlanStatus();
  // Gating (doble condición): vet con matrícula aprobada + feature del plan.
  const isApprovedVet = user?.role === 'veterinario' && user?.vet_license_status === 'approved';
  const hasLibretaFeature = planStatus?.features?.includes('libreta_digital') ?? false;
  const canCertify = isApprovedVet && hasLibretaFeature;
  const inputCls = 'w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none';
  return (
    <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm lg:rounded-2xl lg:border-gray-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
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
        <div className="flex items-center gap-2">
          {isApprovedVet && (
            <button
              onClick={downloadCert}
              disabled={certLoading || !canCertify}
              title={canCertify ? 'Emitir certificado oficial de libreta sanitaria' : 'Requiere plan con libreta digital + matrícula aprobada'}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer disabled:cursor-not-allowed ${
                canCertify
                  ? 'bg-[var(--color-primary)] text-white shadow-sm hover:opacity-90 disabled:opacity-60'
                  : 'border border-[var(--surface-card-border)] bg-[var(--surface-page)] text-gray-400'
              }`}
            >
              {!canCertify
                ? <Lock className="h-3 w-3" />
                : <ShieldCheck className="h-3.5 w-3.5" />}
              {certLoading ? 'Emitiendo...' : 'Emitir certificado'}
            </button>
          )}
          {records.length > 0 && (
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-primary)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--color-primary)] hover:bg-clay-500 hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {pdfLoading ? 'Generando...' : 'PDF'}
            </button>
          )}
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
      </div>

      <HealthBook records={records} canEdit={canEdit} onCertify={onCertify} />

      {showForm && (
        <form className="mb-3 space-y-2 rounded-xl border border-green-100 bg-green-50 dark:bg-green-500/10 p-3"
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
                <option value="sanidad">Sanidad</option>
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

function PedigreeSectionWrapper({ horse, isOwner, isAdmin }: { horse: import('@/types').Horse; isOwner: boolean; isAdmin: boolean }) {
  const canEdit = isOwner || isAdmin;
  return <PedigreeSection horse={horse} canEdit={canEdit} />;
}

/* ─── Financial Dashboard ─── */

function FinancialDashboard({
  financial,
  onExportCSV,
}: {
  financial: import('@/hooks/use-financial-summary').FinancialSummary | undefined;
  onExportCSV: () => void;
}) {
  if (!financial) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-6 shadow-sm text-center">
        <p className="text-sm text-gray-400">Cargando datos financieros...</p>
      </div>
    );
  }

  if (financial.total === 0 && financial.monthly.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-[var(--surface-card)] p-8 shadow-sm text-center">
        <Banknote className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
        <p className="mt-2 text-sm font-medium text-gray-500">Sin gastos registrados</p>
        <p className="mt-1 text-xs text-gray-400">Los gastos de tipo "Gasto" aparecerán aquí con su categoría</p>
      </div>
    );
  }

  const maxMonthly = Math.max(...financial.monthly.map((m) => m.total), 1);
  const maxCategory = Math.max(...financial.by_category.map((c) => c.total), 1);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Dashboard financiero</h2>
          <button onClick={onExportCSV}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-purple-50 dark:bg-purple-500/10 p-4">
            <p className="text-[11px] font-semibold text-purple-500 dark:text-purple-300 uppercase tracking-wide">Total acumulado</p>
            <p className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-200">{formatMoney(financial.total)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide">Promedio mensual</p>
            <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">{formatMoney(financial.average_monthly)}</p>
          </div>
        </div>
      </div>

      {/* Categorías */}
      {financial.by_category.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Gasto por categoría</h3>
          <div className="space-y-3">
            {financial.by_category.map((c) => {
              const cat = EXPENSE_CATEGORIES.find((x) => x.value === c.category);
              const CatIcon = cat?.Icon ?? Package;
              const pct = (c.total / financial.total) * 100;
              return (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <CatIcon size={14} style={{ color: CATEGORY_COLORS[c.category] ?? '#6b7280' }} />
                      {cat?.label ?? c.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatMoney(c.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(c.total / maxCategory) * 100}%`,
                          backgroundColor: CATEGORY_COLORS[c.category] ?? '#6b7280',
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px] text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evolución mensual */}
      {financial.monthly.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Evolución mensual</h3>
          <div className="space-y-2">
            {financial.monthly.slice(0, 12).map((m) => {
              const [year, month] = m.month.split('-');
              const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-right text-[11px] text-gray-400">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-400" style={{ width: `${(m.total / maxMonthly) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] font-medium text-gray-700">{formatMoney(m.total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gastos recientes */}
      {financial.recent_expenses.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Últimos gastos</h3>
          <div className="space-y-2">
            {financial.recent_expenses.map((exp) => {
              const cat = EXPENSE_CATEGORIES.find((x) => x.value === exp.expense_category);
              const CatIcon = cat?.Icon ?? Package;
              return (
                <div key={exp.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <CatIcon size={18} className="shrink-0" style={{ color: CATEGORY_COLORS[exp.expense_category ?? ''] ?? '#6b7280' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{exp.description}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(exp.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {cat && <> · <span style={{ color: CATEGORY_COLORS[exp.expense_category ?? ''] ?? '#6b7280' }}>{cat.label}</span></>}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-gray-900">{formatMoney(exp.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Send to Establishment Modal ─── */

interface EstabItem { id: string; name: string; horse_count: number; }

function SendToEstabModal({ horseId, horseName, onClose }: {
  horseId: string; horseName: string; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedEstab, setSelectedEstab] = useState<EstabItem | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const { data: estabs = [] } = useQuery<EstabItem[]>({
    queryKey: ['directorio', search],
    queryFn: async () => {
      const url = search ? `/auth/directorio?search=${encodeURIComponent(search)}` : '/auth/directorio';
      return (await api.get(url)).data;
    },
  });

  const { data: requests = [] } = useBoardingRequests();
  const create = useCreateBoardingRequest();

  const alreadyPending = (estabId: string) =>
    requests.some((r) => r.horse_id === horseId && r.establishment_id === estabId && r.status === 'pending');

  const handleSubmit = async () => {
    if (!selectedEstab) return;
    await create.mutateAsync({ horse_id: horseId, establishment_id: selectedEstab.id, message: message.trim() || undefined });
    setSent(true);
  };

  if (sent) return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[var(--overlay)] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] p-8 text-center shadow-xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>
        <p className="text-base font-bold text-gray-900">¡Solicitud enviada!</p>
        <p className="mt-2 text-sm text-gray-400">
          <strong>{selectedEstab?.name}</strong> recibirá una notificación y podrá aceptar o rechazar la solicitud para <strong>{horseName}</strong>.
        </p>
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-clay-500 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-[#7f5628] transition">
          Cerrar
        </button>
      </div>
    </div>,
    document.body,
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998] bg-[var(--overlay)]" onClick={onClose} />
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between bg-clay-500 px-6 py-4">
            <p className="font-bold text-white">Enviar a establecimiento</p>
            <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Enviás una solicitud de pensión para <span className="font-semibold text-gray-800">{horseName}</span>.
            </p>

            {/* Search establishments */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Buscar establecimiento *</label>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedEstab(null); }}
                placeholder="Nombre del establecimiento..."
                className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none transition"
              />
              {estabs.length > 0 && !selectedEstab && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-[var(--surface-card)] shadow-sm">
                  {estabs.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { setSelectedEstab(e); setSearch(e.name); }}
                      disabled={alreadyPending(e.id)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      <span className="font-medium text-gray-800">{e.name}</span>
                      {alreadyPending(e.id)
                        ? <span className="text-[11px] text-amber-600 font-medium">Pendiente</span>
                        : <span className="text-[11px] text-gray-400">{e.horse_count} caballos</span>
                      }
                    </button>
                  ))}
                </div>
              )}
              {selectedEstab && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-sm font-medium text-emerald-800">{selectedEstab.name}</span>
                  <button onClick={() => { setSelectedEstab(null); setSearch(''); }} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Mensaje (opcional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Presentate o aclará lo que necesitás..."
                className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2.5 text-sm resize-none focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none transition"
              />
            </div>

            {create.isError && (
              <p className="text-xs text-red-500">No se pudo enviar la solicitud. Intentá de nuevo.</p>
            )}
          </div>

          <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedEstab || create.isPending}
              className="flex-1 rounded-lg bg-clay-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-[#7f5628] transition"
            >
              {create.isPending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ─── Rutina: helpers de "prueba de trabajo" ─── */
const ROUTINE_HISTORY_ITEMS = [
  { key: 'morning_feed',   short: 'Comida mañana' },
  { key: 'afternoon_feed', short: 'Comida tarde' },
  { key: 'evening_feed',   short: 'Comida noche' },
  { key: 'water_ok',       short: 'Agua' },
  { key: 'paddock',        short: 'Paddock' },
  { key: 'trained',        short: 'Entrenamiento' },
  { key: 'health_check',   short: 'Revisión salud' },
] as const;

function fillerLine(r: DailyRoutine): string | null {
  if (!r.filler) return null;
  const hora = new Date(r.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${r.filler.name} · ${hora}`;
}

function RoutineHistory({ routines, todayISO }: { routines: DailyRoutine[] | undefined; todayISO: string }) {
  const past = (routines ?? [])
    .filter((r) => r.date !== todayISO)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!past.length) return null;
  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Últimos días</h3>
      <div className="space-y-2">
        {past.map((r) => {
          const done = ROUTINE_HISTORY_ITEMS.filter(({ key }) => r[key]);
          const autor = fillerLine(r);
          return (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-[var(--surface-page)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700 capitalize">
                  {new Date(r.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                {autor && <span className="shrink-0 text-[10px] text-gray-400">{autor}</span>}
              </div>
              {done.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {done.map(({ key, short }) => (
                    <span key={key} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {short}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="mt-1.5 block text-[10px] text-gray-300">Sin registros</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HorseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, can } = useAuth();
  const toast = useToast();

  const { data: horse, isLoading, error } = useHorse(id);
  const { data: ownership } = useHorseOwnership(id);
  const { data: events } = useEventsByHorse(id);
  const { data: financial } = useFinancialSummary(id, user?.role !== 'jinete' && user?.role !== 'peon');
  const { data: propietarios } = usePropietarios();
  const { data: vets } = useHorseVets(id);
  const { data: veterinarios } = useVeterinarios();
  const assignVet = useAssignVet(id);
  const removeVet = useRemoveVet(id);
  const { data: assignees } = useHorseAssignees(id);
  const assignMember = useAssignMember(id);
  const removeMember = useRemoveMember(id);
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
  const { data: movements } = useHorseMovements(id);
  const deleteActivityPhoto = useDeleteActivityPhoto(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const addMedical = useAddMedicalRecord(id);
  const deleteMedical = useDeleteMedicalRecord(id);
  const todayISO = new Date().toISOString().split('T')[0];
  const todayRoutine = routines?.find((r) => r.date === todayISO);
  const deleteHorse = useDeleteHorse();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();
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
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);
  const activityPhotoInputRef = useRef<HTMLInputElement>(null);
  const [activityPhotoType, setActivityPhotoType] = useState('otro');
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newBodyCondition, setNewBodyCondition] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showSendEstab, setShowSendEstab] = useState(false);
  const [contentTab, setContentTab] = useState<'historial' | 'medico' | 'fotos' | 'rutina' | 'galeria' | 'finanzas'>('historial');
  const shareEvent = useShareEvent();
  const [showAddMedical, setShowAddMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<CreateMedicalRecordDto>({
    type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0],
  });

  const canEdit = can('horses', 'update');
  const { data: orgMembers } = useHorseOrgMembers(id, canEdit);

  // Roles operativos (jinete/peon): no ven nada financiero.
  const isJineteOrPeon = user?.role === 'jinete' || user?.role === 'peon';

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
      const link = `${PUBLIC_BASE}/historial/${data.token}`;
      await navigator.clipboard.writeText(link);
      toast.success('Enlace copiado al portapapeles', { title: 'Válido 72 horas' });
    } catch {
      toast.error('No se pudo generar el enlace.');
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
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200 border-t-[var(--color-primary)]" />
      </div>
    );
  }

  /* ─── Error / Not Found ─── */
  if (error || !horse) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-gray-500">No se encontro el caballo</p>
        <Link href="/caballos" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          Volver a caballos
        </Link>
      </div>
    );
  }

  const sortedEvents = events
    ? [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const galleryEvents = sortedEvents.filter((ev) => (ev.photos?.length ?? 0) > 0);

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
          <div className="fixed inset-0 z-[998] bg-[var(--overlay)]" onClick={() => setShowAddWeight(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-orange-600 px-5 py-4">
                <p className="font-bold text-white">Registrar peso</p>
                <button onClick={() => setShowAddWeight(false)} className="text-white/70 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">Peso (kg) *</label>
                    <input type="number" step="0.1" min="1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="450.0"
                      className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2 text-sm focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">Condición (1-9)</label>
                    <input type="number" min="1" max="9" value={newBodyCondition} onChange={(e) => setNewBodyCondition(e.target.value)}
                      placeholder="5"
                      className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2 text-sm focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Fecha</label>
                  <input type="date" value={newWeightDate} onChange={(e) => setNewWeightDate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2 text-sm focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Notas (opcional)</label>
                  <textarea rows={2} value={newWeightNotes} onChange={(e) => setNewWeightNotes(e.target.value)}
                    placeholder="Observaciones..."
                    className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-3 py-2 text-sm resize-none focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
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

      {/* Modal enviar a establecimiento */}
      {showSendEstab && horse && (
        <SendToEstabModal
          horseId={horse.id}
          horseName={horse.name}
          onClose={() => setShowSendEstab(false)}
        />
      )}

      {/* Modal asignar veterinario */}
      {showAssignVet && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-[var(--overlay)]" onClick={() => setShowAssignVet(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-teal-600 px-5 py-4">
                <p className="font-bold text-white">Asignar veterinario</p>
                <button onClick={() => setShowAssignVet(false)} className="text-white/70 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
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
                    className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
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

      {/* Modal asignar equipo */}
      {showAssignTeam && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-[var(--overlay)]" onClick={() => setShowAssignTeam(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-clay-600 px-5 py-4">
                <p className="font-bold text-white">Asignar equipo</p>
                <button onClick={() => setShowAssignTeam(false)} className="text-white/70 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Seleccioná el miembro del equipo que podrá ver y trabajar sobre <strong>{horse?.name}</strong>. Jinetes y peones solo ven los caballos que les asignes.
                </p>
                {!orgMembers?.length ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No hay miembros (jinete / peón / encargado) en la organización de este caballo.
                  </p>
                ) : (
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
                  >
                    <option value="">Seleccionar persona...</option>
                    {orgMembers
                      .filter((m) => !assignees?.some((a) => a.user_id === m.user_id))
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name} · {orgRoleLabel[m.role_in_org] ?? m.role_in_org}
                        </option>
                      ))
                    }
                  </select>
                )}
                {assignMember.isError && (
                  <p className="text-xs text-red-500">No se pudo asignar la persona.</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAssignTeam(false)}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedMemberId) return;
                      await assignMember.mutateAsync(selectedMemberId);
                      setShowAssignTeam(false);
                      setSelectedMemberId('');
                    }}
                    disabled={!selectedMemberId || assignMember.isPending}
                    className="flex-1 rounded-lg bg-clay-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-clay-700 transition"
                  >
                    {assignMember.isPending ? 'Asignando...' : 'Confirmar'}
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
          <div className="fixed inset-0 z-[998] bg-[var(--overlay)]" onClick={() => setShowTransfer(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
              <div className="flex items-center justify-between bg-amber-600 px-5 py-4">
                <p className="font-bold text-white">Transferir {horse?.name}</p>
                <button onClick={() => setShowTransfer(false)} className="text-white/70 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Seleccioná el nuevo propietario. Esta acción es irreversible y quedará registrada en el historial.
                </p>
                <select
                  value={transferOwnerId}
                  onChange={(e) => setTransferOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none"
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
        <div className="relative -mx-4 aspect-[4/3] overflow-hidden bg-zinc-900">
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
        <div className="relative -mt-12 rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-xl">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{horse.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {horse.horse_record_id && (
              <HorseVerifiedBadge variant="soft" size="md" className="rounded-full" />
            )}
            {horse.breed && (
              <span className="rounded-full bg-clay-500/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] ring-1 ring-clay-500/20">
                {horse.breed.name}
              </span>
            )}
            {horse.activity && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                {horse.activity.name}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {infoItems.map((item) => (
              <InfoItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          {(canEdit || canDelete || isOwner) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {canEdit && (
                <Link
                  href={`/caballos?edit=${horse.id}`}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
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
              {isOwner && (
                <button
                  onClick={() => setShowSendEstab(true)}
                  className="flex-1 rounded-xl border border-[var(--color-primary)]/20 py-2.5 text-xs font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)]/40 hover:bg-clay-500/5 cursor-pointer"
                >
                  Establecimiento
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex-1 rounded-xl border border-blue-100 py-2.5 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
              >
                Compartir
              </button>
              {horse.public_token && (
                <button
                  onClick={() => setShowQR(true)}
                  className="flex-1 rounded-xl border border-emerald-100 py-2.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                >
                  QR
                </button>
              )}
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
          <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm">
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
          <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
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
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={v.user?.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-700">{v.user?.name}</p>
                        <p className="truncate text-xs text-gray-400">{v.user?.email}</p>
                      </div>
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

        {/* Equipo asignado (mobile) */}
        {(canEdit || (assignees && assignees.length > 0)) && (
          <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </span>
                <h2 className="text-base font-bold text-gray-900">Equipo</h2>
                {assignees && assignees.length > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{assignees.length}</span>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => { setSelectedMemberId(''); setShowAssignTeam(true); }}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Asignar
                </button>
              )}
            </div>
            {!assignees?.length ? (
              <p className="text-xs text-gray-400">Sin personas asignadas. Jinetes y peones solo ven los caballos que les asignes.</p>
            ) : (
              <div className="space-y-1.5">
                {assignees.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={m.user?.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-700">{m.user?.name}</p>
                        <p className="truncate text-xs text-gray-400">{m.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {m.role && <RoleBadge role={m.role} size="sm" />}
                      {canEdit && (
                        <button
                          onClick={() => removeMember.mutate(m.user_id)}
                          className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                          title="Quitar del equipo"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab bar de contenido (mobile) ─── */}
        <div className="rounded-2xl border border-gray-100 bg-[var(--surface-card)] p-1 shadow-sm flex gap-1">
          {([
            { key: 'historial', label: 'Historial', count: sortedEvents.length },
            { key: 'galeria',   label: 'Galería',   count: galleryEvents.length },
            { key: 'medico',    label: 'Médico',    count: medicalRecords?.length },
            { key: 'fotos',     label: 'Fotos',     count: activityPhotos?.length },
            { key: 'rutina',    label: 'Rutina',    count: null },
            { key: 'finanzas',  label: 'Finanzas',  count: null },
          ] as const).filter(({ key }) => !(isJineteOrPeon && key === 'finanzas')).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setContentTab(key)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                contentTab === key ? 'bg-clay-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className={`ml-1 text-[10px] ${contentTab === key ? 'text-white/70' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Peso y condición corporal (mobile) */}
        <div className={`rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm ${contentTab !== 'medico' ? 'hidden' : ''}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
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
        <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
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

        {/* Dashboard financiero (mobile) */}
        {contentTab === 'finanzas' && (
          <FinancialDashboard financial={financial} onExportCSV={handleExportCSV} />
        )}

        {/* Rutina diaria (mobile) */}
        {contentTab === 'rutina' && (
          <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Rutina de hoy</h2>
                <p className="text-[11px] text-gray-400">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                {todayRoutine && fillerLine(todayRoutine) && (
                  <p className="text-[11px] font-medium text-gray-500">Cargó {fillerLine(todayRoutine)}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROUTINE_ITEMS.map(({ key, label }) => {
                const checked = todayRoutine?.[key] ?? false;
                return (
                  <button key={key} onClick={canFillRoutine ? () => toggleRoutineItem(key) : undefined} disabled={!canFillRoutine}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${canFillRoutine ? 'cursor-pointer' : 'cursor-default'} ${
                      checked ? 'border-green-200 bg-green-50 text-green-700' : `border-gray-200 text-gray-500 ${canFillRoutine ? 'hover:bg-gray-50' : ''}`
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
            {!canFillRoutine && (
              <p className="mt-3 text-[10px] text-gray-400">Solo lectura · no tenés permiso para editar la rutina.</p>
            )}
            <RoutineHistory routines={routines} todayISO={todayISO} />
          </div>
        )}

        {/* Historial de eventos */}
        <div className={`rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm ${contentTab !== 'historial' ? 'hidden' : ''}`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
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
                style={{ backgroundColor: 'var(--color-primary)' }}
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
                  onShare={isOwner ? (id) => shareEvent.mutate(id) : undefined}
                  onTogglePublic={isOwner ? (id, val) => updateEvent.mutate({ id, is_public: val }) : undefined}
                  canEditMetrics={canEditEvent}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Galería de eventos (mobile) */}
        {contentTab === 'galeria' && (
          <div className="rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Galería</h2>
              {isOwner && galleryEvents.length > 0 && (
                <span className="text-[11px] text-gray-400">Tocá Compartir para publicar en el feed</span>
              )}
            </div>
            {galleryEvents.length === 0 ? (
              <p className="text-xs text-gray-400">Aún no hay eventos con fotos o videos.</p>
            ) : (
              <div className="space-y-4">
                {galleryEvents.map((ev) => {
                  const badge = typeBadge[ev.type] ?? typeBadge.nota;
                  return (
                    <div key={ev.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className={`grid ${ev.photos!.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
                        {ev.photos!.slice(0, 4).map((p, i) => p.file_type === 'video' ? (
                          <div key={p.id} className={`relative bg-zinc-900 ${ev.photos!.length === 1 ? 'aspect-video' : 'aspect-square'} ${i === 3 && ev.photos!.length > 4 ? 'relative' : ''}`}>
                            <video src={p.url} className="h-full w-full object-cover opacity-70" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80">
                                <svg className="h-4 w-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            </div>
                            {i === 3 && ev.photos!.length > 4 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-lg font-bold text-white">+{ev.photos!.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div key={p.id} className={`relative ${ev.photos!.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                            <img src={p.url} alt="" className="h-full w-full object-cover" />
                            {i === 3 && ev.photos!.length > 4 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-lg font-bold text-white">+{ev.photos!.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                          <span className="text-xs text-gray-400">{formatDate(ev.date)}</span>
                          {ev.is_public && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">Publicado</span>}
                        </div>
                        {isOwner && !ev.feed_post_id && (
                          <button
                            onClick={() => shareEvent.mutate(ev.id)}
                            disabled={shareEvent.isPending}
                            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition cursor-pointer disabled:opacity-50"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                            </svg>
                            Compartir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Fotos de actividad (mobile) */}
        <div className={`rounded-3xl border border-gray-100 bg-[var(--surface-card)] p-5 shadow-sm ${contentTab !== 'fotos' ? 'hidden' : ''}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500/10 text-[var(--color-primary)]">
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
                className="rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-2 py-1 text-xs focus:outline-none"
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
                    <p className="mt-0.5 text-[9px] text-gray-400 text-center leading-tight">
                      {p.photographer?.name ? `${p.photographer.name} · ` : ''}
                      {new Date(p.taken_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historial médico (mobile) */}
        {contentTab === 'medico' && (
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
            onCertify={(name) => { setMedicalForm({ type: 'sanidad', name, date: new Date().toISOString().split('T')[0] }); setShowAddMedical(true); }}
            isPending={addMedical.isPending}
            horseId={id}
            horseName={horse.name}
          />
        )}

      </div>

      {/* ─── DESKTOP LAYOUT (lg+) ─── */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start">

        {/* ─── Col izquierda: imagen + info ─── */}
        <div className="lg:sticky lg:top-6 space-y-4 mb-6 lg:mb-0">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[var(--surface-card)] shadow-sm">

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
                  <span className="rounded-full bg-clay-500/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
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
            {(canEdit || canDelete || isOwner || horse.public_token) && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
                {horse.public_token && (
                  <button
                    onClick={() => setShowQR(true)}
                    className="flex-1 rounded-lg border border-emerald-100 py-2 text-xs font-medium text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                  >
                    Ver QR
                  </button>
                )}
                {canEdit && (
                  <Link
                    href={`/caballos?edit=${horse.id}`}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-xs font-medium text-gray-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
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
                {isOwner && (
                  <button
                    onClick={() => setShowSendEstab(true)}
                    className="flex-1 rounded-lg border border-[var(--color-primary)]/20 py-2 text-xs font-medium text-[var(--color-primary)] transition hover:border-[var(--color-primary)]/40 hover:bg-clay-500/5 cursor-pointer"
                  >
                    Establecimiento
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
            <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
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
            <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
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
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={v.user?.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-700">{v.user?.name}</p>
                          <p className="truncate text-xs text-gray-400">{v.user?.email}</p>
                        </div>
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

          {/* ─── Equipo asignado (desktop) ─── */}
          {(canEdit || (assignees && assignees.length > 0)) && (
            <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Equipo</h2>
                {canEdit && (
                  <button
                    onClick={() => { setSelectedMemberId(''); setShowAssignTeam(true); }}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Asignar
                  </button>
                )}
              </div>
              {!assignees?.length ? (
                <p className="text-xs text-gray-400">Sin personas asignadas. Jinetes y peones solo ven los caballos que les asignes.</p>
              ) : (
                <div className="space-y-1.5">
                  {assignees.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={m.user?.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-700">{m.user?.name}</p>
                          <p className="truncate text-xs text-gray-400">{m.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {m.role && <RoleBadge role={m.role} size="sm" />}
                        {canEdit && (
                          <button
                            onClick={() => removeMember.mutate(m.user_id)}
                            className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition cursor-pointer"
                            title="Quitar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Documentos (desktop) ─── */}
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
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

          {/* ─── Resumen financiero (desktop sidebar) ─── */}
          {!isJineteOrPeon && financial && financial.total > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Finanzas</h2>
                <button onClick={() => setContentTab('finanzas')}
                  className="text-[10px] font-medium text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200 transition cursor-pointer"
                >
                  Ver detalle →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-purple-50 dark:bg-purple-500/10 p-3">
                  <p className="text-[10px] font-medium text-purple-500 dark:text-purple-300 uppercase tracking-wide">Total</p>
                  <p className="mt-0.5 text-base font-bold text-purple-900 dark:text-purple-200">{formatMoney(financial.total)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Prom/mes</p>
                  <p className="mt-0.5 text-base font-bold text-gray-900">{formatMoney(financial.average_monthly)}</p>
                </div>
              </div>
              {financial.by_category.length > 0 && (
                <div className="space-y-1.5">
                  {financial.by_category.slice(0, 4).map((c) => {
                    const cat = EXPENSE_CATEGORIES.find((x) => x.value === c.category);
                    const CatIcon = cat?.Icon ?? Package;
                    const maxVal = Math.max(...financial.by_category.map((x) => x.total));
                    return (
                      <div key={c.category} className="flex items-center gap-2">
                        <span className="w-5 flex justify-center"><CatIcon size={13} style={{ color: CATEGORY_COLORS[c.category] ?? '#6b7280' }} /></span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${maxVal > 0 ? (c.total / maxVal) * 100 : 0}%`, backgroundColor: CATEGORY_COLORS[c.category] ?? '#6b7280' }} />
                        </div>
                        <span className="w-16 text-right text-[10px] font-medium text-gray-600">{formatMoney(c.total)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        {/* ─── Movimientos ─── */}
          {movements && movements.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
              <h2 className="mb-2.5 text-sm font-semibold text-gray-900">Historial de movimientos</h2>
              <div className="space-y-2">
                {movements.map((m) => (
                  <MovementRow key={m.id} movement={m} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Col derecha: peso + eventos ─── */}
        <div className="space-y-4">

        {/* Tab bar desktop */}
        <div className="flex gap-1 rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-page)] p-1">
          {([
            { key: 'historial', label: 'Historial', count: sortedEvents.length },
            { key: 'galeria',   label: 'Galería',   count: galleryEvents.length },
            { key: 'medico',    label: 'Médico',    count: medicalRecords?.length },
            { key: 'fotos',     label: 'Fotos',     count: activityPhotos?.length },
            { key: 'rutina',    label: 'Rutina',    count: null },
            { key: 'finanzas',  label: 'Finanzas',  count: null },
          ] as const).filter(({ key }) => !(isJineteOrPeon && key === 'finanzas')).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setContentTab(key)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition cursor-pointer ${
                contentTab === key ? 'bg-[var(--surface-card)] text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${contentTab === key ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Peso (desktop) */}
        {contentTab === 'medico' && <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
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
        </div>}

        {/* Rutina diaria (desktop) */}
        {contentTab === 'rutina' && (
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Rutina de hoy</h2>
              <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              {todayRoutine && fillerLine(todayRoutine) && (
                <p className="text-[10px] font-medium text-gray-500">Cargó {fillerLine(todayRoutine)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ROUTINE_ITEMS.map(({ key, label }) => {
                const checked = todayRoutine?.[key] ?? false;
                return (
                  <button key={key} onClick={canFillRoutine ? () => toggleRoutineItem(key) : undefined} disabled={!canFillRoutine}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition ${canFillRoutine ? 'cursor-pointer' : 'cursor-default'} ${
                      checked ? 'border-green-200 bg-green-50 text-green-700' : `border-gray-100 text-gray-500 ${canFillRoutine ? 'hover:bg-gray-50' : ''}`
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
            {!canFillRoutine && (
              <p className="mt-2.5 text-[10px] text-gray-400">Solo lectura · no tenés permiso para editar la rutina.</p>
            )}
            <RoutineHistory routines={routines} todayISO={todayISO} />
          </div>
        )}

        {/* Eventos (desktop) */}
        {contentTab === 'historial' && <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
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
                className="flex items-center gap-1 rounded-lg bg-clay-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-clay-500/90 cursor-pointer"
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
                  onShare={isOwner ? (id) => shareEvent.mutate(id) : undefined}
                  onTogglePublic={isOwner ? (id, val) => updateEvent.mutate({ id, is_public: val }) : undefined}
                  canEditMetrics={canEditEvent}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>}

        {/* Galería (desktop) */}
        {contentTab === 'galeria' && (
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Galería
                {galleryEvents.length > 0 && <span className="ml-1.5 text-xs font-normal text-gray-400">({galleryEvents.length} eventos)</span>}
              </h2>
              {isOwner && <span className="text-[11px] text-gray-400">Compartí eventos con fotos al feed del caballo</span>}
            </div>
            {galleryEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">Aún no hay eventos con fotos o videos.</p>
            ) : (
              <div className="space-y-4">
                {galleryEvents.map((ev) => {
                  const badge = typeBadge[ev.type] ?? typeBadge.nota;
                  return (
                    <div key={ev.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className={`grid ${ev.photos!.length === 1 ? 'grid-cols-1' : ev.photos!.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-0.5`}>
                        {ev.photos!.slice(0, 6).map((p, i) => p.file_type === 'video' ? (
                          <div key={p.id} className={`relative bg-zinc-900 ${ev.photos!.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                            <video src={p.url} className="h-full w-full object-cover opacity-70" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80">
                                <svg className="h-5 w-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            </div>
                            {i === 5 && ev.photos!.length > 6 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-xl font-bold text-white">+{ev.photos!.length - 6}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div key={p.id} className={`relative ${ev.photos!.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                            <img src={p.url} alt="" className="h-full w-full object-cover" />
                            {i === 5 && ev.photos!.length > 6 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-xl font-bold text-white">+{ev.photos!.length - 6}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                          <span className="text-xs text-gray-500 line-clamp-1">{ev.description}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(ev.date)}</span>
                          {ev.is_public && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">Publicado</span>}
                        </div>
                        {isOwner && !ev.feed_post_id && (
                          <button
                            onClick={() => shareEvent.mutate(ev.id)}
                            disabled={shareEvent.isPending}
                            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                            </svg>
                            Compartir al feed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Historial médico (desktop) */}
        {contentTab === 'medico' && <MedicalSection
          records={medicalRecords ?? []}
          canEdit={canEdit}
          showForm={showAddMedical}
          form={medicalForm}
          onOpenForm={() => setShowAddMedical(true)}
          onCloseForm={() => { setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0] }); }}
          onFormChange={(f) => setMedicalForm((prev) => ({ ...prev, ...f }))}
          onSubmit={async () => { await addMedical.mutateAsync(medicalForm); setShowAddMedical(false); setMedicalForm({ type: 'vacuna', name: '', date: new Date().toISOString().split('T')[0] }); }}
          onDelete={(rid) => deleteMedical.mutate(rid)}
          onCertify={(name) => { setMedicalForm({ type: 'sanidad', name, date: new Date().toISOString().split('T')[0] }); setShowAddMedical(true); }}
          isPending={addMedical.isPending}
          horseId={id}
          horseName={horse.name}
        />}

        {/* Fotos (desktop) */}
        {contentTab === 'fotos' && (
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Fotos verificadas</h2>
              <div className="flex items-center gap-2">
                <select value={activityPhotoType} onChange={(e) => setActivityPhotoType(e.target.value)}
                  className="rounded-lg border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-2 py-1 text-xs focus:outline-none"
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
                  + Foto
                </button>
              </div>
            </div>
            {!activityPhotos?.length ? (
              <p className="text-xs text-gray-400">Sin fotos. Las fotos tomadas con el botón incluyen sello de fecha y autor.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {activityPhotos.map((p) => {
                  const meta = ACTIVITY_TYPES[p.activity_type] ?? ACTIVITY_TYPES.otro;
                  return (
                    <div key={p.id}>
                      <div className="relative group aspect-square">
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                          <img src={p.url} alt={meta.label} className="h-full w-full rounded-xl object-cover" />
                        </a>
                        <span className={`absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      </div>
                      <p className="mt-0.5 text-[9px] text-gray-400 leading-tight text-center">
                        {p.photographer?.name ? `${p.photographer.name} · ` : ''}
                        {new Date(p.taken_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dashboard financiero (desktop) */}
        {contentTab === 'finanzas' && (
          <FinancialDashboard financial={financial} onExportCSV={handleExportCSV} />
        )}

        </div>{/* cierre space-y-4 col derecha */}
      </div>{/* cierre grid desktop */}

      {/* Sección de Pedigrí — debajo del grid, full width */}
      <PedigreeSectionWrapper horse={horse} isOwner={!!isOwner} isAdmin={user?.role === 'admin'} />

      {/* ─── Modal QR ─── */}
      {showQR && horse.public_token && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-[var(--overlay)] backdrop-blur-sm" onClick={() => setShowQR(false)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-xs rounded-3xl bg-[var(--surface-card)] shadow-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1a3a6b 100%)' }}>
                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Código QR</p>
                  <p className="text-lg font-bold text-white">{horse.name}</p>
                </div>
                <button onClick={() => setShowQR(false)} className="text-white/50 hover:text-white transition cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-white p-3 shadow-inner border border-gray-100">
                  <QRCode
                    value={`${PUBLIC_BASE}/caballo/${horse.public_token}`}
                    size={200}
                    fgColor="#9d6c35"
                    bgColor="#ffffff"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800">Escaneá para ver el perfil</p>
                  <p className="text-xs text-gray-400 mt-1">El perfil es permanente y público</p>
                </div>
                <div className="w-full space-y-2">
                  <button
                    onClick={() => {
                      const url = `${PUBLIC_BASE}/caballo/${horse.public_token}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Enlace copiado');
                    }}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Copiar enlace
                  </button>
                  <button
                    onClick={() => {
                      const svg = document.querySelector('#qr-modal svg') as SVGElement;
                      if (!svg) return;
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement('canvas');
                      canvas.width = 400; canvas.height = 400;
                      const ctx = canvas.getContext('2d')!;
                      const img = new window.Image();
                      img.onload = () => {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, 400, 400);
                        ctx.drawImage(img, 0, 0, 400, 400);
                        const a = document.createElement('a');
                        a.download = `qr-${horse.name}.png`;
                        a.href = canvas.toDataURL();
                        a.click();
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                    }}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold text-white cursor-pointer transition"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Descargar QR
                  </button>
                </div>
              </div>
              <div id="qr-modal" className="hidden">
                <QRCode value={`${PUBLIC_BASE}/caballo/${horse.public_token}`} size={400} fgColor="#9d6c35" bgColor="#ffffff" />
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
