import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications.service';
import { NotificationSettingsService } from '../notification-settings.service';
import { NotificationsGateway } from '../notifications.gateway';
import { EventCreatedEvent } from '../events/event-created.event';
import { NotificationType } from '../notification.entity';
import { HorseUser } from '../../horses/horse-user.entity';
import { EVENT_TYPE_LABEL_MAP } from '../../events/event-type.constants';
import { EmailService } from '../../email/email.service';

@Injectable()
export class EventCreatedListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: NotificationSettingsService,
    private readonly gateway: NotificationsGateway,
    private readonly emailService: EmailService,
    @InjectRepository(HorseUser)
    private readonly horseUserRepo: Repository<HorseUser>,
  ) {}

  @OnEvent('event.created')
  async handle(payload: EventCreatedEvent): Promise<void> {
    const { event, horse, creator } = payload;

    // Get all users linked to this horse with their roles
    const horseUsers = await this.horseUserRepo.find({
      where: { horse_id: horse.id },
      relations: ['user'],
    });

    // Filter: exclude the creator, and check notification settings by role
    const recipients = horseUsers
      .filter((hu) => hu.user_id !== creator.id)
      .filter((hu) => this.settingsService.shouldNotify(hu.user.role, event.type));

    if (!recipients.length) return;

    const typeLabel = EVENT_TYPE_LABEL_MAP[event.type] || event.type;

    const notifications = await this.notificationsService.createMany(
      recipients.map((hu) => ({
        type: NotificationType.EVENT_CREATED,
        title: `Nuevo evento de ${typeLabel}`,
        message: `${creator.name} registró un evento para ${horse.name}: ${event.description}`,
        recipient_id: hu.user_id,
        event_id: event.id,
        actor_id: creator.id,
      })),
    );

    for (const notification of notifications) {
      this.gateway.sendToUser(notification.recipient_id, notification);
    }

    // Email: disparar en background, sin bloquear
    for (const hu of recipients) {
      if (hu.user?.email) {
        this.emailService.sendEventNotification({
          to: hu.user.email,
          recipientName: hu.user.name,
          actorName: creator.name,
          horseName: horse.name,
          eventType: typeLabel,
          description: event.description,
        }).catch(() => {});
      }
    }
  }
}
