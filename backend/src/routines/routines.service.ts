import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyRoutine } from './daily-routine.entity';
import { UpsertRoutineDto } from './dto/upsert-routine.dto';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(DailyRoutine)
    private readonly routineRepository: Repository<DailyRoutine>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async findByHorse(horseId: string, user: User, limit = 30): Promise<DailyRoutine[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    return this.routineRepository.find({
      where: { horse_id: horseId },
      order: { date: 'DESC' },
      take: limit,
    });
  }

  async upsert(horseId: string, dto: UpsertRoutineDto, user: User): Promise<DailyRoutine> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const existing = await this.routineRepository.findOne({
      where: { horse_id: horseId, date: dto.date },
    });

    let routine: DailyRoutine;
    if (existing) {
      Object.assign(existing, dto);
      existing.filled_by = user.id;
      routine = await this.routineRepository.save(existing);
    } else {
      routine = await this.routineRepository.save(
        this.routineRepository.create({
          horse_id: horseId,
          date: dto.date,
          morning_feed: dto.morning_feed ?? false,
          afternoon_feed: dto.afternoon_feed ?? false,
          evening_feed: dto.evening_feed ?? false,
          water_ok: dto.water_ok ?? false,
          paddock: dto.paddock ?? false,
          trained: dto.trained ?? false,
          health_check: dto.health_check ?? false,
          box_cleaned: dto.box_cleaned ?? false,
          groomed: dto.groomed ?? false,
          observations: dto.observations ?? null,
          filled_by: user.id,
        }),
      );

      // Notificar al propietario y a los encargados (capataces) cuando el
      // establecimiento, peón o vet carga la rutina — cerrar el loop de supervisión
      if (user.role !== 'propietario' && horse.owner_id !== user.id) {
        const summary = this.buildSummary(routine);
        const recipientIds = await this.resolveRecipients(horse, user);
        const notifications = await this.notificationsService.createMany(
          recipientIds.map((recipient_id) => ({
            type: NotificationType.HEALTH_REMINDER,
            title: `Rutina diaria — ${horse.name}`,
            message: `${user.name} cargó la rutina de ${horse.name}: ${summary}`,
            recipient_id,
          })),
        );
        for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);
      }
    }

    return routine;
  }

  /**
   * Resuelve los destinatarios de la notificación: el propietario del caballo
   * más los encargados (capataces) de su organización. Deduplica y excluye a
   * quien hizo la acción. Si el caballo no tiene organización, solo el owner.
   */
  private async resolveRecipients(horse: Horse, user: User): Promise<string[]> {
    const recipients = new Set<string>();
    if (horse.owner_id) recipients.add(horse.owner_id);

    if (horse.organization_id) {
      const encargados: { user_id: string }[] = await this.horseRepository.query(
        `SELECT om.user_id
           FROM organization_members om
          WHERE om.organization_id = $1
            AND om.role_in_org = 'encargado'`,
        [horse.organization_id],
      );
      for (const e of encargados) recipients.add(e.user_id);
    }

    recipients.delete(user.id);
    return [...recipients];
  }

  private buildSummary(r: DailyRoutine): string {
    const items: string[] = [];
    if (r.morning_feed || r.afternoon_feed || r.evening_feed) items.push('comió');
    if (r.water_ok) items.push('tomó agua');
    if (r.paddock) items.push('salió al paddock');
    if (r.trained) items.push('entrenó');
    if (r.health_check) items.push('revisión de salud');
    return items.length ? items.join(', ') : 'rutina registrada';
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;
    if (user.role === 'propietario' && horse.owner_id === user.id) return;
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) return;
    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id },
    });
    if (entry) return;
    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
