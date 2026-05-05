import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const WS_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:3001/api')
  .replace('/api', '');

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationsContextType {
  unread: number;
  notifications: NotificationItem[];
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unread: 0,
  notifications: [],
  markAllRead: () => {},
});

export function NotificationsProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    let s: Socket;
    (async () => {
      const token = await getToken();
      if (!token) return;

      s = io(WS_URL, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
      });

      s.on('notification', (n: NotificationItem) => {
        setNotifications((prev) => [n, ...prev]);
      });

      setSocket(s);
    })();

    return () => { s?.disconnect(); };
  }, [userId]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ unread, notifications, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
