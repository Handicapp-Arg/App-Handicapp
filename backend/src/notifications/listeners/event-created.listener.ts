import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';
import { EventCreatedEvent } from '../events/event-created.event';
import { NotificationType } from '../notification.entity';
import { resolveRecipients } from '../resolvers/recipient-resolver';

const EVENT_TYPE_LABELS: Record<string, string> = {
  salud: 'Salud',
  entrenamiento: 'Entrenamiento',
  gasto: 'Gasto',
  nota: 'Nota',
};

@Injectable()
export class EventCreatedListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @OnEvent('event.created')
  async handle(payload: EventCreatedEvent): Promise<void> {
    const { event, horse, creator } = payload;
    const recipientIds = resolveRecipients(horse, creator.id);

    if (!recipientIds.length) return;

    const notifications = await this.notificationsService.createMany(
      recipientIds.map((recipientId) => ({
        type: NotificationType.EVENT_CREATED,
        title: `Nuevo evento de ${EVENT_TYPE_LABELS[event.type] || event.type}`,
        message: `${creator.name} registró un evento para ${horse.name}: ${event.description}`,
        recipient_id: recipientId,
        event_id: event.id,
        actor_id: creator.id,
      })),
    );

    for (const notification of notifications) {
      this.gateway.sendToUser(notification.recipient_id, notification);
    }
  }
}
