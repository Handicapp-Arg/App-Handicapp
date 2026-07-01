import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { MedicalRecord } from '../medical/medical-record.entity';
import { User } from '../auth/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { PlansService } from '../plans/plans.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class MedicalRemindersService {
  private readonly logger = new Logger(MedicalRemindersService.name);

  constructor(
    @InjectRepository(MedicalRecord)
    private readonly medicalRepo: Repository<MedicalRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly plansService: PlansService,
  ) {}

  // Corre todos los días a las 8:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkMedicalDueDates(): Promise<void> {
    this.logger.log('Verificando vencimientos médicos...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca registros con next_due en los próximos 7 días (incluyendo hoy)
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const todayISO = today.toISOString().split('T')[0];
    const in7DaysISO = in7Days.toISOString().split('T')[0];

    const records: Array<MedicalRecord & { owner_id: string; owner_email: string; owner_name: string; owner_phone: string | null; horse_name: string }> =
      await this.medicalRepo.query(
        `SELECT mr.*, h.name AS horse_name, u.id AS owner_id, u.email AS owner_email, u.name AS owner_name, u.phone AS owner_phone
         FROM medical_records mr
         JOIN horses h ON h.id = mr.horse_id
         JOIN users u ON u.id = h.owner_id
         WHERE mr.next_due IS NOT NULL
           AND mr.next_due >= $1
           AND mr.next_due <= $2
           AND h.deleted_at IS NULL`,
        [todayISO, in7DaysISO],
      );

    if (!records.length) {
      this.logger.log('Sin vencimientos médicos próximos');
      return;
    }

    this.logger.log(`${records.length} vencimientos médicos próximos`);

    for (const rec of records) {
      const dueDate = new Date(rec.next_due + 'T12:00:00');
      const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
      const dueDateStr = dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

      const urgencyLabel = daysUntil === 0 ? '⚠️ Hoy vence' : daysUntil === 1 ? '⏰ Mañana vence' : `📋 Vence en ${daysUntil} días`;
      const title = `${urgencyLabel} — ${rec.name}`;
      const message = `${rec.name} de ${rec.horse_name} vence el ${dueDateStr}`;

      const notifications = await this.notificationsService.createMany([{
        type: NotificationType.HEALTH_REMINDER,
        title,
        message,
        recipient_id: rec.owner_id,
      }]);

      for (const n of notifications) {
        this.gateway.sendToUser(n.recipient_id, n);
      }

      // Solo enviar email los días clave: 7, 3, 1 días antes y el mismo día
      if ([0, 1, 3, 7].includes(daysUntil)) {
        await this.emailService.sendMedicalReminder({
          to: rec.owner_email,
          recipientName: rec.owner_name,
          horseName: rec.horse_name,
          recordName: rec.name,
          dueDate: dueDateStr,
          daysUntilDue: daysUntil,
        }).catch(() => {});

        // WhatsApp al owner (gateado por plan + opt-in). Nunca rompe el cron.
        // TODO: gating por org (hoy se gatea por el user owner).
        if (rec.owner_phone) {
          const owner = await this.userRepository.findOne({ where: { id: rec.owner_id } });
          if (
            owner?.phone &&
            owner.whatsapp_opt_in &&
            (await this.plansService.hasFeature('whatsapp', { user: owner }))
          ) {
            await this.whatsappService
              .sendMedicalReminder(owner.phone, rec.horse_name, `${rec.name} — ${dueDateStr}`)
              .catch(() => {});
          }
        }
      }
    }
  }
}
