import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import api from './api';
import * as SecureStore from './secure-storage';

/**
 * Notificaciones push.
 *
 * El backend ya guarda el token (`POST /auth/push-token`) y lo usa para enviar
 * desde `notifications.gateway`. Lo que faltaba era este lado: pedir el permiso,
 * conseguir el token de Expo y mandarlo. Hasta ahora esta función devolvía
 * `null` siempre —quedó así de cuando la app corría en Expo Go, que no soporta
 * push—, así que nadie recibía nada.
 */

// Con la app abierta igual mostramos la notificación: si no, el usuario que está
// mirando el muro no se entera de que le asignaron una tarea.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function obtenerProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export async function registerForPushNotifications(): Promise<string | null> {
  // El simulador no puede recibir push: no tiene con qué registrarse en APNs.
  if (!Device.isDevice) return null;

  // Si el usuario las apagó desde Configuración, el re-registro automático del
  // arranque no debe volver a prenderlas a sus espaldas.
  const pref = await SecureStore.getItemAsync('push_enabled').catch(() => null);
  if (pref === 'off') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9d6c35',
    });
  }

  const { status: actual } = await Notifications.getPermissionsAsync();
  let status = actual;

  // Solo preguntamos si el usuario todavía no decidió. Si ya dijo que no, se
  // respeta: insistir en cada arranque es molesto y iOS lo ignora igual.
  if (status !== 'granted') {
    const { status: pedido } = await Notifications.requestPermissionsAsync();
    status = pedido;
  }
  if (status !== 'granted') return null;

  const projectId = obtenerProjectId();
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

export async function savePushToken(token: string): Promise<void> {
  try {
    await api.post('/auth/push-token', { token });
  } catch {
    // silencioso
  }
}

export interface PushPayload {
  notification_id?: string;
  deepLink?: string;
  type?: string;
  [key: string]: unknown;
}

interface PushHandlers {
  /** Llegó una notificación con la app abierta. */
  onReceived?: (payload: PushPayload, title?: string, body?: string) => void;
  /** El usuario tocó la notificación. */
  onResponse?: (payload: PushPayload, title?: string, body?: string) => void;
}

export function usePushNotificationListeners(handlers: PushHandlers): void {
  // Guardamos los handlers en una ref para no re-suscribirnos en cada render
  // cuando el componente padre los redefine.
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const recibida = Notifications.addNotificationReceivedListener((n) => {
      const { title, body, data } = n.request.content;
      ref.current.onReceived?.((data ?? {}) as PushPayload, title ?? undefined, body ?? undefined);
    });

    const tocada = Notifications.addNotificationResponseReceivedListener((r) => {
      const { title, body, data } = r.notification.request.content;
      ref.current.onResponse?.((data ?? {}) as PushPayload, title ?? undefined, body ?? undefined);
    });

    return () => {
      recibida.remove();
      tocada.remove();
    };
  }, []);
}

/** Escribe el número del globito rojo del ícono de la app. */
export async function setBadgeCount(cantidad: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, cantidad));
  } catch {
    // silencioso
  }
}

/** Limpia el globito rojo del ícono. */
export async function clearBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // silencioso
  }
}
