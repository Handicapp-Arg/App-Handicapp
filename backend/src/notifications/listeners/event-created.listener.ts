import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';
import { EventCreatedEvent } from '../events/event-created.event';
import { NotificationType } from '../notification.entity';

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
    const recipientId = this.resolveRecipient(creator, horse);

    if (!recipientId) return;

    const notification = await this.notificationsService.create({
      type: NotificationType.EVENT_CREATED,
      title: `Nuevo evento de ${EVENT_TYPE_LABELS[event.type] || event.type}`,
      message: `${creator.name} registró un evento para ${horse.name}: ${event.description}`,
      recipient_id: recipientId,
      event_id: event.id,
      actor_id: creator.id,
    });

    this.gateway.sendToUser(recipientId, notification);
  }

  private resolveRecipient(
    creator: { id: string; role: string },
    horse: { owner_id: string; establishment_id: string | null },
  ): string | null {
    if (creator.role === 'establecimiento') {
      return horse.owner_id;
    }
    if (creator.role === 'propietario') {
      return horse.establishment_id;
    }
    return null;
  }
}
