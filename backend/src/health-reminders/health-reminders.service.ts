import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import { NotificationType } from '../notifications/notification.entity';

const REMINDER_DAYS = parseInt(process.env.HEALTH_REMINDER_DAYS ?? '30', 10);

@Injectable()
export class HealthRemindersService {
  private readonly logger = new Logger(HealthRemindersService.name);

  constructor(
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
    private readonly emailService: EmailService,
  ) {}

  // Todos los días a las 8:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkHealthReminders(): Promise<void> {
    this.logger.log(`Verificando recordatorios de salud (umbral: ${REMINDER_DAYS} días)`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - REMINDER_DAYS);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    // Caballos cuyo último evento de salud fue hace más de REMINDER_DAYS días
    // o que nunca tuvieron uno
    const horses: { id: string; name: string; owner_id: string; last_salud: string | null }[] =
      await this.horseRepository.query(
        `SELECT h.id, h.name, h.owner_id,
                MAX(e.date) FILTER (WHERE e.type = 'salud' AND e.deleted_at IS NULL) AS last_salud
         FROM horses h
         LEFT JOIN events e ON e.horse_id = h.id
         WHERE h.deleted_at IS NULL
         GROUP BY h.id, h.name, h.owner_id
         HAVING MAX(e.date) FILTER (WHERE e.type = 'salud' AND e.deleted_at IS NULL) < $1
             OR MAX(e.date) FILTER (WHERE e.type = 'salud' AND e.deleted_at IS NULL) IS NULL`,
        [cutoffISO],
      );

    if (!horses.length) {
      this.logger.log('Sin recordatorios pendientes');
      return;
    }

    this.logger.log(`${horses.length} caballos requieren recordatorio`);

    for (const horse of horses) {
      const daysSince = horse.last_salud
        ? Math.floor((Date.now() - new Date(horse.last_salud).getTime()) / 86_400_000)
        : null;

      const message = daysSince
        ? `${horse.name} no tiene un registro de salud desde hace ${daysSince} días.`
        : `${horse.name} nunca tuvo un registro de salud registrado.`;

      // Destinatarios: owner + vets asignados
      const vets = await this.horseUserRepository.find({
        where: { horse_id: horse.id, role: 'vet' },
        relations: ['user'],
      });

      const recipientIds = [
        horse.owner_id,
        ...vets.map((v) => v.user_id),
      ];

      const notifications = await this.notificationsService.createMany(
        recipientIds.map((id) => ({
          type: NotificationType.HEALTH_REMINDER,
          title: `Recordatorio de salud — ${horse.name}`,
          message,
          recipient_id: id,
        })),
      );

      for (const n of notifications) {
        this.gateway.sendToUser(n.recipient_id, n);
      }

      // Email al owner
      const ownerData: { email: string; name: string }[] = await this.horseRepository.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [horse.owner_id],
      );
      if (ownerData[0]?.email) {
        await this.emailService.sendEventNotification({
          to: ownerData[0].email,
          recipientName: ownerData[0].name,
          actorName: 'HandicApp',
          horseName: horse.name,
          eventType: 'Recordatorio de salud',
          description: message,
        }).catch(() => {});
      }
    }
  }
}
