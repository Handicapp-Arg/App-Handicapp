import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotificationsService } from '../notifications.service';
import { NotificationSettingsService } from '../notification-settings.service';
import { NotificationsGateway } from '../notifications.gateway';
import { EventCreatedEvent } from '../events/event-created.event';
import { NotificationType } from '../notification.entity';
import { resolveRecipients } from '../resolvers/recipient-resolver';
import { User } from '../../auth/user.entity';
import { EVENT_TYPE_LABEL_MAP } from '../../events/event-type.constants';

@Injectable()
export class EventCreatedListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: NotificationSettingsService,
    private readonly gateway: NotificationsGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @OnEvent('event.created')
  async handle(payload: EventCreatedEvent): Promise<void> {
    const { event, horse, creator } = payload;
    const recipientIds = resolveRecipients(horse, creator.id);

    if (!recipientIds.length) return;

    const recipients = await this.userRepo.find({
      where: { id: In(recipientIds) },
      select: ['id', 'role'],
    });

    const allowedIds = recipients
      .filter((u) => this.settingsService.shouldNotify(u.role, event.type))
      .map((u) => u.id);

    if (!allowedIds.length) return;

    const typeLabel = EVENT_TYPE_LABEL_MAP[event.type] || event.type;

    const notifications = await this.notificationsService.createMany(
      allowedIds.map((recipientId) => ({
        type: NotificationType.EVENT_CREATED,
        title: `Nuevo evento de ${typeLabel}`,
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
