import { Injectable, Logger } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushService.name);

  async sendToTokens(
    tokens: (string | null | undefined)[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
    /** Globito rojo del ícono. Sin esto iOS no muestra ningún número. */
    badge?: number,
  ): Promise<void> {
    const validTokens = tokens.filter((t): t is string => !!t && Expo.isExpoPushToken(t));
    if (!validTokens.length) return;

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      priority: 'high',
      ...(badge === undefined ? {} : { badge }),
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        this.logger.error('Error enviando push notification', err);
      }
    }
  }
}
