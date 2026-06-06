import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import api from './api';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  return null;
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
  onReceived?: (payload: PushPayload, title?: string, body?: string) => void;
  onResponse?: (payload: PushPayload, title?: string, body?: string) => void;
}

// No-op en Expo Go: push notifications requieren un development build
export function usePushNotificationListeners(_handlers: PushHandlers): void {
  useEffect(() => {
    // Push notifications deshabilitadas en Expo Go (SDK 53+)
    // Para habilitar: usar un development build con eas build --profile development
    void Platform.OS; // referencia para evitar tree-shaking
  }, []);
}

export async function clearBadge(): Promise<void> {
  // No-op en Expo Go
}
