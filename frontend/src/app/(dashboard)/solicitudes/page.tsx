'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  useBoardingRequests,
  useAcceptBoardingRequest,
  useRejectBoardingRequest,
  type BoardingRequest,
} from '@/hooks/use-boarding-requests';
import { Horse } from '@phosphor-icons/react';
import {
  PageHeader, Badge, Button, EmptyState, ListSkeleton, type BadgeTone,
} from '@/components/ui';

/* ─── Status ─── */
const STATUS_META: Record<BoardingRequest['status'], { label: string; tone: BadgeTone }> = {
  pending:  { label: 'Pendiente',  tone: 'warning' },
  accepted: { label: 'Aceptada',  tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'danger' },
};

type Filter = 'all' | BoardingRequest['status'];
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'Todas' },
  { value: 'pending',  label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

/* ─── Card ─── */
function RequestCard({
  req,
  isEstab,
  onAccept,
  onReject,
  pending,
}: {
  req: BoardingRequest;
  isEstab: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  pending: boolean;
}) {
  const meta = STATUS_META[req.status];
  const dateStr = new Date(req.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        {/* Ícono caballo */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Horse size={22} weight="regular" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {req.horse?.name ?? '—'}
            </p>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>

          {isEstab ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Solicitado por <span className="font-medium text-slate-700">{req.requester?.name}</span>
              {req.requester?.email && <span className="text-slate-400"> · {req.requester.email}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">
              A <span className="font-medium text-slate-700">{req.establishment?.name ?? '—'}</span>
            </p>
          )}

          {req.message && (
            <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600 italic">
              "{req.message}"
            </p>
          )}

          <p className="mt-1.5 text-[11px] text-slate-400">{dateStr}</p>
        </div>
      </div>

      {/* Acciones — solo para establecimiento con solicitud pendiente */}
      {isEstab && req.status === 'pending' && (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => onReject(req.id)}
          >
            Rechazar
          </Button>
          <Button
            size="sm"
            disabled={pending}
            loading={pending}
            onClick={() => onAccept(req.id)}
          >
            Aceptar
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function SolicitudesPage() {
  const { user } = useAuth();
  const { data: requests, isLoading } = useBoardingRequests();
  const accept = useAcceptBoardingRequest();
  const reject = useRejectBoardingRequest();
  const [filter, setFilter] = useState<Filter>('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const isEstab = user?.role === 'establecimiento';

  const filtered = (requests ?? []).filter(
    (r) => filter === 'all' || r.status === filter,
  );

  const pendingCount = (requests ?? []).filter((r) => r.status === 'pending').length;

  const handleAccept = async (id: string) => {
    setActingId(id);
    await accept.mutateAsync(id).catch(() => {});
    setActingId(null);
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    await reject.mutateAsync(id).catch(() => {});
    setActingId(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Solicitudes de pensión"
        subtitle={isEstab ? 'Propietarios que quieren traer sus caballos a tu establecimiento' : 'Tus solicitudes de pensión enviadas'}
        badge={pendingCount > 0 ? { label: `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`, tone: 'warning' } : undefined}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === f.value
                ? 'bg-navy-700 text-white shadow-sm'
                : 'bg-[var(--surface-card)] border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          }
          title="Sin solicitudes"
          message={
            filter !== 'all'
              ? `No hay solicitudes ${STATUS_META[filter as BoardingRequest['status']]?.label.toLowerCase() ?? ''}.`
              : isEstab
              ? 'Cuando un propietario solicite traer su caballo, aparecerá aquí.'
              : 'Buscá establecimientos en el Directorio para enviar solicitudes.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              isEstab={isEstab}
              onAccept={handleAccept}
              onReject={handleReject}
              pending={actingId === req.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
