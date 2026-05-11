import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import api from './api';

// Cómo mostrar la notificación cuando la app está activa
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HandicApp',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch {
    return null;
  }
}

export async function savePushToken(token: string): Promise<void> {
  try {
    await api.post('/auth/push-token', { token });
  } catch {
    // No bloquear el flujo si el backend está temporalmente fuera
  }
}

export interface PushPayload {
  /** id de la notificación persistida */
  notification_id?: string;
  /** Ruta interna a la que llevar al tap (e.g. "/(tabs)/eventos") */
  deepLink?: string;
  /** Tipo lógico (event_created, contract_signed, etc.) */
  type?: string;
  /** Campos extra dependientes del tipo */
  [key: string]: unknown;
}

interface PushHandlers {
  /** Cuando llega push con la app en foreground o background pero no abierta. */
  onReceived?: (payload: PushPayload, title?: string, body?: string) => void;
  /** Cuando el usuario tapea la notificación (abre la app). */
  onResponse?: (payload: PushPayload, title?: string, body?: string) => void;
}

/**
 * Hook que conecta los listeners de Expo Notifications con callbacks tipados.
 * Idempotente: monta/desmonta los listeners según el ciclo de vida del componente.
 */
export function usePushNotificationListeners({ onReceived, onResponse }: PushHandlers): void {
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notif) => {
      const data = (notif.request.content.data ?? {}) as PushPayload;
      onReceived?.(data, notif.request.content.title ?? undefined, notif.request.content.body ?? undefined);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = (res.notification.request.content.data ?? {}) as PushPayload;
      onResponse?.(data, res.notification.request.content.title ?? undefined, res.notification.request.content.body ?? undefined);
    });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [onReceived, onResponse]);
}

/** Limpia el badge de la app (ícono) — útil al abrir la pantalla de notificaciones. */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
