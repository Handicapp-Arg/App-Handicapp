'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, CalendarDays, List as ListIcon } from 'lucide-react';
import { useAgenda, useCreateAppointment, useCompleteAppointment, useDeleteAppointment, APPOINTMENT_TYPES, type ServiceAppointment } from '@/hooks/use-agenda';
import { useHorses } from '@/hooks/use-horses';
import ConfirmDialog from '@/components/confirm-dialog';
import AgendaCalendar, { appointmentDateKey } from '@/components/agenda-calendar';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/ui/container';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';

const TYPE_OPTIONS = Object.entries(APPOINTMENT_TYPES).map(([value, meta]) => ({ value, ...meta }));

function AppointmentCard({
  appt,
  onComplete,
  onDelete,
}: {
  appt: ServiceAppointment;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = APPOINTMENT_TYPES[appt.type] ?? APPOINTMENT_TYPES.otro;
  const time = new Date(appt.scheduled_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] p-4 shadow-sm transition ${appt.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
          {appt.horse && <span className="text-xs text-gray-400 font-medium">{appt.horse.name}</span>}
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!appt.completed && (
            <button onClick={() => onComplete(appt.id)}
              className="rounded-md p-1 text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-500 transition cursor-pointer"
              title="Marcar como completado"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          )}
          <button onClick={() => onDelete(appt.id)}
            className="rounded-md p-1 text-gray-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-800">{appt.title}</p>
      {appt.notes && <p className="mt-0.5 text-xs text-gray-500">{appt.notes}</p>}
      {appt.completed && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><Check size={14} /> Completado</p>}
    </div>
  );
}

function CreateModal({ horses, onClose }: { horses: { id: string; name: string }[]; onClose: () => void }) {
  const create = useCreateAppointment();
  const [horseId, setHorseId] = useState(horses[0]?.id ?? '');
  const [type, setType] = useState('veterinario');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horseId || !title || !date) return;
    const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
    await create.mutateAsync({ horse_id: horseId, type, title, scheduled_at, notes: notes || undefined });
    onClose();
  };

  const inputCls = 'w-full rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:bg-[var(--surface-card)] focus:outline-none';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998] hidden sm:block bg-[var(--overlay)] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-[var(--surface-card)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--surface-card-border)] px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Nuevo turno</h2>
            <button onClick={onClose} aria-label="Cerrar" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Caballo</label>
              <select value={horseId} onChange={(e) => setHorseId(e.target.value)} className={inputCls}>
                {horses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TYPE_OPTIONS.map((t) => (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                      type === t.value
                        ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-white/30 dark:bg-white/10 dark:text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${t.bg}`} aria-hidden />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Título *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Control anual con Dr. García" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Fecha *</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Hora</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." className={`${inputCls} resize-none`} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending} className="flex-1 rounded-xl bg-clay-500 py-2.5 text-sm font-semibold text-white transition hover:bg-clay-600 disabled:opacity-50 cursor-pointer">
                {create.isPending ? 'Guardando...' : 'Crear turno'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [view, setView] = useState<'upcoming' | 'all'>('upcoming');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // En calendario siempre traemos todos los turnos (igual que el móvil).
  const { data: appointments, isLoading } = useAgenda(viewMode === 'list' ? view === 'upcoming' : false);
  const { data: horses } = useHorses();
  const complete = useCompleteAppointment();
  const deleteAppt = useDeleteAppointment();

  const grouped = appointments?.reduce<Record<string, typeof appointments>>((acc, a) => {
    const day = new Date(a.scheduled_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(a);
    return acc;
  }, {}) ?? {};

  const dayAppts = selectedDate
    ? (appointments ?? []).filter((a) => appointmentDateKey(new Date(a.scheduled_at)) === selectedDate)
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        action={<div className="flex items-center gap-2">
          {/* Toggle lista / calendario */}
          <div
            role="tablist"
            aria-label="Vista de agenda"
            className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
          >
            <button
              role="tab"
              aria-selected={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                viewMode === 'list' ? 'bg-[var(--surface-card)] text-gray-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" aria-hidden />
              Lista
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'calendar'}
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                viewMode === 'calendar' ? 'bg-[var(--surface-card)] text-gray-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Calendario
            </button>
          </div>

          {/* Próximos / Todos (solo en lista) */}
          {viewMode === 'list' && (
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['upcoming', 'all'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    view === v ? 'bg-[var(--surface-card)] text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v === 'upcoming' ? 'Próximos' : 'Todos'}
                </button>
              ))}
            </div>
          )}
          {horses && horses.length > 0 && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition cursor-pointer active:scale-95"
              style={{ backgroundColor: 'var(--color-clay-500)' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo turno
            </button>
          )}
        </div>}
      />

      {isLoading ? (
        <Container width="content" className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}</Container>
      ) : viewMode === 'calendar' ? (
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[1fr_380px]">
          <AgendaCalendar
            appointments={appointments ?? []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Sidebar: turnos del día seleccionado */}
          <div className="rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] shadow-sm overflow-hidden">
            {selectedDate ? (
              <>
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold capitalize">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {dayAppts.length} turno{dayAppts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {dayAppts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">Sin turnos este día</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-3">
                    {dayAppts.map((appt) => (
                      <AppointmentCard
                        key={appt.id}
                        appt={appt}
                        onComplete={(id) => complete.mutate(id)}
                        onDelete={setDeletingId}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-4 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-gray-200" strokeWidth={1} />
                <p className="text-sm text-gray-400">Seleccioná un día para ver sus turnos</p>
              </div>
            )}
          </div>
        </div>
      ) : !appointments?.length ? (
        <EmptyState
          icon={CalendarDays}
          title={view === 'upcoming' ? 'No tenés turnos próximos' : 'Todavía no registraste turnos'}
          message={
            view === 'upcoming'
              ? 'Programá vacunaciones, visitas del veterinario o herrajes y los vas a ver acá.'
              : 'Cuando cargues turnos en la agenda, van a aparecer en esta lista.'
          }
          action={
            horses && horses.length > 0
              ? { label: 'Crear turno', onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      ) : (
        <Container width="content" className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">{day}</p>
              {items.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onComplete={(id) => complete.mutate(id)}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          ))}
        </Container>
      )}

      {showCreate && horses && horses.length > 0 && (
        <CreateModal horses={horses} onClose={() => setShowCreate(false)} />
      )}

      {deletingId && (
        <ConfirmDialog
          title="¿Eliminar turno?"
          message="Se eliminará el turno de la agenda."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={async () => { await deleteAppt.mutateAsync(deletingId); setDeletingId(null); }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
