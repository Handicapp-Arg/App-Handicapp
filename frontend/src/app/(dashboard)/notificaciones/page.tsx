'use client';

import { useRouter } from 'next/navigation';
import {
  FileText, Stethoscope, Receipt, AlertCircle, File,
  CheckCircle2, XCircle, UserPlus, Users, Home, Trophy, Award, Lock,
  ArrowUp, Bell, type LucideIcon,
} from 'lucide-react';
import { useNotifications, useMarkAsRead } from '@/hooks/use-notifications';
import { PageLoader } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

type NotifData = { id: string; title: string; message: string; read: boolean; type: string; created_at: string; event_id: string | null };

const TYPE_META: Record<string, { icon: LucideIcon; chip: string }> = {
  event_created:       { icon: FileText,     chip: 'bg-blue-50 text-blue-600' },
  health_reminder:     { icon: Stethoscope,  chip: 'bg-red-50 text-red-600' },
  billing:             { icon: Receipt,      chip: 'bg-clay-100 text-clay-600' },
  bill_created:        { icon: Receipt,      chip: 'bg-clay-100 text-clay-600' },
  bill_disputed:       { icon: AlertCircle,  chip: 'bg-amber-50 text-amber-600' },
  contract:            { icon: File,         chip: 'bg-emerald-50 text-emerald-600' },
  contract_signed:     { icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-600' },
  contract_rejected:   { icon: XCircle,      chip: 'bg-red-50 text-red-600' },
  invitation_received: { icon: UserPlus,     chip: 'bg-blue-50 text-blue-600' },
  invitation_accepted: { icon: Users,        chip: 'bg-emerald-50 text-emerald-600' },
  boarding_request:    { icon: Home,         chip: 'bg-orange-50 text-orange-600' },
  bid_placed:          { icon: Trophy,       chip: 'bg-orange-50 text-orange-600' },
  auction_won:         { icon: Award,        chip: 'bg-emerald-50 text-emerald-600' },
  auction_closed:      { icon: Lock,         chip: 'bg-gray-100 text-gray-500' },
  auction_outbid:      { icon: ArrowUp,      chip: 'bg-red-50 text-red-600' },
  default:             { icon: Bell,         chip: 'bg-gray-100 text-gray-500' },
};

function NotifItem({
  n,
  onRead,
  onClick,
}: {
  n: NotifData;
  onRead: (id: string) => void;
  onClick: (n: NotifData) => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.default;
  const Icon = meta.icon;
  const timeStr = new Date(n.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      onClick={() => onClick(n)}
      className={`group flex cursor-pointer items-start gap-3.5 rounded-2xl p-4 transition-all duration-150 ${
        n.read
          ? 'bg-[var(--surface-card)] shadow-[var(--shadow-card)] hover:shadow-md'
          : 'bg-clay-50 ring-1 ring-clay-100 hover:bg-clay-100/50'
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-tight ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
            {n.title}
          </p>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay-500" />}
        </div>
        <p className={`mt-0.5 text-sm leading-relaxed ${n.read ? 'text-gray-400' : 'text-gray-600'}`}>
          {n.message}
        </p>
        <p className="mt-1.5 text-xs text-gray-400">{timeStr}</p>
      </div>
      {!n.read && (
        <button
          onClick={(e) => { e.stopPropagation(); onRead(n.id); }}
          className="shrink-0 self-center rounded-lg px-2.5 py-1 text-[11px] font-semibold text-clay-600 transition hover:bg-clay-100 cursor-pointer"
        >
          Leída
        </button>
      )}
    </div>
  );
}

export default function NotificacionesPage() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const unread = notifications?.filter((n) => !n.read) ?? [];
  const read = notifications?.filter((n) => n.read) ?? [];

  const handleOpen = (n: { id: string; event_id: string | null; read: boolean }) => {
    if (!n.read) markAsRead.mutate(n.id);
    if (n.event_id) router.push(`/eventos?event=${n.event_id}`);
    else router.push('/eventos');
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {unread.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Tenés <span className="font-semibold text-gray-900">{unread.length}</span> sin leer
          </p>
          <button
            onClick={() => markAsRead.mutate(undefined)}
            disabled={markAsRead.isPending}
            className="text-sm font-semibold text-clay-600 transition hover:text-clay-700 disabled:opacity-50 cursor-pointer"
          >
            Marcar todas como leídas
          </button>
        </div>
      )}

      {!notifications?.length && (
        <EmptyState
          icon={
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          }
          title="Sin notificaciones"
          message="Cuando haya actividad en tus caballos, aparecerá aquí."
        />
      )}

      {unread.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1">Sin leer</p>
          {unread.map((n) => (
            <NotifItem key={n.id} n={n} onRead={(id) => markAsRead.mutate(id)} onClick={handleOpen} />
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1">Anteriores</p>
          {read.slice(0, 20).map((n) => (
            <NotifItem key={n.id} n={n} onRead={(id) => markAsRead.mutate(id)} onClick={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
