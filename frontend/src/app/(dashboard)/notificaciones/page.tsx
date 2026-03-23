'use client';

import { useNotifications, useMarkAsRead } from '@/hooks/use-notifications';

export default function NotificacionesPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        {notifications && notifications.some((n) => !n.read) && (
          <button
            onClick={() => markAsRead.mutate(undefined)}
            disabled={markAsRead.isPending}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {!notifications?.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No tenés notificaciones</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 transition ${
                n.read
                  ? 'border-gray-200 bg-white'
                  : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-gray-600">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString('es-AR')}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead.mutate(n.id)}
                    disabled={markAsRead.isPending}
                    className="shrink-0 text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Leída
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
