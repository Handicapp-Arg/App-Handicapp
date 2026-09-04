import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';

import api, { getToken } from './api';
import { clearBadge, setBadgeCount, usePushNotificationListeners, type PushPayload } from './push-notifications';

const WS_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:3001/api').replace('/api', '');

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  recipient_id: string;
  event_id: string | null;
  actor_id: string | null;
  created_at: string;
}

interface NotificationsContextType {
  unread: number;
  notifications: NotificationItem[];
  loading: boolean;
  isError: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unread: 0,
  notifications: [],
  loading: false,
  isError: false,
  refresh: async () => {},
  markAllRead: async () => {},
  markOneRead: async () => {},
});

/** Mapea un payload push a una ruta interna. Centralizado para test/maintenance. */
function deepLinkFor(payload: PushPayload): string | null {
  if (payload.deepLink && typeof payload.deepLink === 'string') return payload.deepLink;
  switch (payload.type) {
    case 'event_created':
    case 'health_reminder':
      return '/(tabs)/eventos';
    case 'invitation_received':
      return payload.token ? `/invitacion/${payload.token}` : '/organizacion';
    case 'invitation_accepted':
      return '/organizacion';
    case 'boarding_request':
      return '/(tabs)';
    case 'contract_signed':
    case 'contract_rejected':
      return '/(tabs)/contratos';
    case 'bill_created':
    case 'bill_disputed':
      return '/(tabs)/facturacion';
    default:
      return null;
  }
}

export function NotificationsProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // ─── Cargar notificaciones existentes desde el backend ───
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data);
      setIsError(false);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    void refresh();
  }, [userId, refresh]);

  // ─── Socket.io: notificaciones en tiempo real cuando la app está abierta ───
  useEffect(() => {
    if (!userId) return;

    let active = true;
    (async () => {
      const token = await getToken();
      if (!token || !active) return;

      const s = io(WS_URL, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
      });

      s.on('notification', (n: NotificationItem) => {
        setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
      });

      socketRef.current = s;
    })();

    // El backend solo manda push si te ve desconectado del socket. Si la app
    // queda en segundo plano con el socket vivo, el servidor cree que estás
    // mirando y no manda nada: la notificación no llega nunca. Por eso soltamos
    // la conexión al salir de primer plano y la recuperamos al volver.
    const onAppState = (estado: AppStateStatus) => {
      if (estado === 'active') socketRef.current?.connect();
      else socketRef.current?.disconnect();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      active = false;
      sub.remove();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  // ─── Push notifications (FCM/APNS via Expo) ───
  usePushNotificationListeners({
    // Llega push con app abierta: refrescar la lista para que aparezca el unread
    onReceived: () => {
      void refresh();
    },
    // El usuario tapeó la notificación → deep-link
    onResponse: (payload) => {
      const target = deepLinkFor(payload);
      if (target) {
        // expo-router acepta string libre — el cast a never permite rutas dinámicas
        router.push(target as never);
      }
      void clearBadge();
      void refresh();
    },
  });

  // ─── markAllRead: PATCH al backend + update optimista ───
  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read', { id: unreadIds });
      await clearBadge();
    } catch {
      await refresh();
    }
  }, [notifications, refresh]);

  // ─── markOneRead: marcar una sola notificación como leída ───
  const markOneRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await api.patch('/notifications/read', { id: [id] });
    } catch {
      await refresh();
    }
  }, [refresh]);

  // ─── Badge: el número del ícono sigue al total sin leer ───
  // El backend lo manda con cada push (para cuando la app está cerrada); acá lo
  // mantenemos al día mientras está abierta, para que baje al leer.
  useEffect(() => {
    const sinLeer = notifications.filter((n) => !n.read).length;
    void setBadgeCount(sinLeer);
  }, [notifications]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ unread, notifications, loading, isError, refresh, markAllRead, markOneRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
