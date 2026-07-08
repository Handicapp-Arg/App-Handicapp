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
import { Inbox } from 'lucide-react';
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
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
            <p className="mt-0.5 text-xs text-gray-500">
              Solicitado por <span className="font-medium text-gray-700">{req.requester?.name}</span>
              {req.requester?.email && <span className="text-gray-400"> · {req.requester.email}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500">
              A <span className="font-medium text-gray-700">{req.establishment?.name ?? '—'}</span>
            </p>
          )}

          {req.message && (
            <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600 italic">
              "{req.message}"
            </p>
          )}

          <p className="mt-1.5 text-[11px] text-gray-400">{dateStr}</p>
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
    <div className="space-y-6">
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
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter === f.value
                ? 'bg-clay-500 text-white border-transparent shadow-sm'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
          icon={Inbox}
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
        <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
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
