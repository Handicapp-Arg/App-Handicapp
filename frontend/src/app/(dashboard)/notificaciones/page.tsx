'use client';

import { useRouter } from 'next/navigation';
import { useNotifications, useMarkAsRead } from '@/hooks/use-notifications';

export default function NotificacionesPage() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const unread = notifications?.filter((n) => !n.read) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  const handleOpen = (n: { id: string; event_id: string | null }) => {
    markAsRead.mutate(n.id);
    if (n.event_id) {
      router.push(`/eventos?event=${n.event_id}`);
    } else {
      router.push('/eventos');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notificaciones</h1>
        {unread.length > 0 && (
          <button
            onClick={() => markAsRead.mutate(undefined)}
            disabled={markAsRead.isPending}
            className="text-sm font-medium text-[#0f1f3d] hover:underline disabled:opacity-50"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {unread.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No tenés notificaciones nuevas</p>
          <p className="mt-1 text-xs text-gray-400">Las notificaciones leídas se ocultan automáticamente</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {unread.map((n) => (
            <li
              key={n.id}
              onClick={() => handleOpen(n)}
              className="group cursor-pointer rounded-2xl border border-blue-100 bg-blue-50/60 p-4 transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{n.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead.mutate(n.id);
                  }}
                  disabled={markAsRead.isPending}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                >
                  Marcar leída
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
