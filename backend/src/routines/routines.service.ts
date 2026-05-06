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
          observations: dto.observations ?? null,
          filled_by: user.id,
        }),
      );

      // Notificar al propietario cuando el establecimiento o vet carga la rutina
      if (user.role !== 'propietario' && horse.owner_id !== user.id) {
        const summary = this.buildSummary(routine);
        const notifications = await this.notificationsService.createMany([{
          type: NotificationType.HEALTH_REMINDER,
          title: `Rutina diaria — ${horse.name}`,
          message: `${user.name} completó la rutina de hoy: ${summary}`,
          recipient_id: horse.owner_id,
        }]);
        for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);
      }
    }

    return routine;
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
