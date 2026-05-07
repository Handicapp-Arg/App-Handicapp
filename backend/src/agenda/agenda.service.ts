import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceAppointment } from './service-appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import { NotificationType } from '../notifications/notification.entity';

const TYPE_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  herrador: 'Herrador',
  competencia: 'Competencia',
  desparasitacion: 'Desparasitación',
  vacuna: 'Vacuna',
  entrenamiento: 'Entrenamiento',
  otro: 'Otro',
};

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(ServiceAppointment)
    private readonly appointmentRepository: Repository<ServiceAppointment>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
    private readonly emailService: EmailService,
  ) {}

  async findByUser(user: User, upcoming?: boolean): Promise<ServiceAppointment[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .leftJoin('a.horse', 'horse')
      .addSelect(['horse.id', 'horse.name'])
      .orderBy('a.scheduled_at', 'ASC');

    if (upcoming) {
      qb.andWhere('a.scheduled_at >= :now', { now: new Date() })
        .andWhere('a.completed = false');
    }

    if (user.role === 'propietario') {
      qb.leftJoin('horse.horseUsers', 'hu')
        .andWhere('horse.owner_id = :uid OR (hu.user_id = :uid AND hu.role = :ownerRole)', {
          uid: user.id, ownerRole: 'owner',
        });
    } else if (user.role === 'establecimiento') {
      qb.andWhere('horse.establishment_id = :uid', { uid: user.id });
    } else if (user.role === 'veterinario') {
      qb.innerJoin('horse.horseUsers', 'hu2').andWhere('hu2.user_id = :uid', { uid: user.id });
    }

    return qb.getMany();
  }

  async findByHorse(horseId: string, user: User): Promise<ServiceAppointment[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    return this.appointmentRepository.find({
      where: { horse_id: horseId },
      order: { scheduled_at: 'ASC' },
    });
  }

  async create(dto: CreateAppointmentDto, user: User): Promise<ServiceAppointment> {
    const horse = await this.horseRepository.findOne({ where: { id: dto.horse_id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const appointment = this.appointmentRepository.create({
      ...dto,
      scheduled_at: new Date(dto.scheduled_at),
      notes: dto.notes ?? null,
      created_by: user.id,
    });
    return this.appointmentRepository.save(appointment);
  }

  async complete(id: string, user: User): Promise<ServiceAppointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!appointment) throw new NotFoundException('Turno no encontrado');
    await this.assertAccess(appointment.horse, user);
    appointment.completed = true;
    return this.appointmentRepository.save(appointment);
  }

  async remove(id: string, user: User): Promise<void> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id }, relations: ['horse'],
    });
    if (!appointment) throw new NotFoundException('Turno no encontrado');
    await this.assertAccess(appointment.horse, user);
    await this.appointmentRepository.remove(appointment);
  }

  // Cron: cada hora verifica turnos en las próximas 24h sin recordatorio enviado
  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders(): Promise<void> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.scheduled_at BETWEEN :now AND :in24h', { now, in24h })
      .andWhere('a.completed = false')
      .andWhere('a.reminder_sent = false')
      .leftJoinAndSelect('a.horse', 'horse')
      .getMany();

    for (const appt of upcoming) {
      const horseUsers = await this.horseUserRepository.find({
        where: { horse_id: appt.horse_id },
      });

      const timeStr = appt.scheduled_at.toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit',
      });
      const typeLabel = TYPE_LABELS[appt.type] ?? appt.type;
      const title = `🗓️ Turno mañana — ${typeLabel}`;
      const message = `${appt.horse.name}: ${appt.title} mañana a las ${timeStr}.`;

      // Incluir propietario del caballo, creador del turno y usuarios asignados
      const recipientIds = new Set<string>([
        appt.horse.owner_id,
        appt.created_by,
        ...horseUsers.map((hu) => hu.user_id),
      ].filter(Boolean));

      const notifications = await this.notificationsService.createMany(
        [...recipientIds].map((recipient_id) => ({
          type: NotificationType.HEALTH_REMINDER,
          title,
          message,
          recipient_id,
        })),
      );

      for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);

      appt.reminder_sent = true;
      await this.appointmentRepository.save(appt);
    }
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;
    if (horse.owner_id === user.id) return;
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) {
      if (horse.organization_id) await this.assertOrgNotSuspended(horse.organization_id);
      return;
    }

    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id },
    });
    if (entry) return;

    if (horse.organization_id) {
      const rows: { role_in_org: string }[] = await this.horseRepository.query(
        `SELECT role_in_org FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
        [horse.organization_id, user.id],
      );
      if (rows.length > 0) {
        if (['admin', 'staff'].includes(rows[0].role_in_org)) {
          await this.assertOrgNotSuspended(horse.organization_id);
        }
        return;
      }
    }

    throw new ForbiddenException('No tenés acceso a este caballo');
  }

  private async assertOrgNotSuspended(orgId: string): Promise<void> {
    const rows: { status: string }[] = await this.horseRepository.query(
      `SELECT status FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId],
    );
    if (rows[0]?.status === 'suspended') {
      throw new ForbiddenException('Esta organización está suspendida.');
    }
  }
}
