'use client';

import { useRouter } from 'next/navigation';
import { useNotifications, useMarkAsRead } from '@/hooks/use-notifications';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoader } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

type NotifData = { id: string; title: string; message: string; read: boolean; type: string; created_at: string; event_id: string | null };

const TYPE_ICON: Record<string, string> = {
  event_created: '📋',
  health_reminder: '💊',
  billing: '💰',
  contract: '📄',
  default: '🔔',
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
  const icon = TYPE_ICON[n.type] ?? TYPE_ICON.default;
  const timeStr = new Date(n.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      onClick={() => onClick(n)}
      className={`group flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-all duration-150 ${
        n.read
          ? 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
          : 'border-blue-100 bg-blue-50/70 hover:bg-blue-50 hover:border-blue-200'
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${
        n.read ? 'bg-gray-50' : 'bg-blue-100'
      }`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-tight ${n.read ? 'text-gray-600' : 'text-gray-900'}`}>
            {n.title}
          </p>
          {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />}
        </div>
        <p className={`mt-0.5 text-sm leading-relaxed ${n.read ? 'text-gray-400' : 'text-gray-600'}`}>
          {n.message}
        </p>
        <p className="mt-1.5 text-xs text-gray-300">{timeStr}</p>
      </div>
      {!n.read && (
        <button
          onClick={(e) => { e.stopPropagation(); onRead(n.id); }}
          className="shrink-0 self-center rounded-lg px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100 cursor-pointer"
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
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Notificaciones"
        badge={unread.length > 0 ? { label: `${unread.length} sin leer`, tone: 'info' } : undefined}
        action={unread.length > 0 ? (
          <button
            onClick={() => markAsRead.mutate(undefined)}
            disabled={markAsRead.isPending}
            className="text-sm font-semibold text-[#0f1f3d] hover:underline disabled:opacity-50 cursor-pointer"
          >
            Marcar todas como leídas
          </button>
        ) : undefined}
      />

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
