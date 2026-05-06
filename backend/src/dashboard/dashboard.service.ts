import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Event } from '../events/event.entity';
import { MedicalRecord } from '../medical/medical-record.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRepository: Repository<MedicalRecord>,
  ) {}

  async getForUser(user: User) {
    if (user.role === 'admin') return this.getAdminDashboard();
    if (user.role === 'propietario') return this.getPropietarioDashboard(user.id);
    if (user.role === 'establecimiento') return this.getEstablecimientoDashboard(user.id);
    if (user.role === 'veterinario') return this.getVeterinarioDashboard(user.id);
    return {};
  }

  private async getAdminDashboard() {
    const [propietarios, establecimientos, caballos, recentEvents] = await Promise.all([
      this.userRepository.count({ where: { role: 'propietario' } }),
      this.userRepository.count({ where: { role: 'establecimiento' } }),
      this.horseRepository.count(),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .orderBy('e.created_at', 'DESC')
        .limit(5)
        .getMany(),
    ]);

    return {
      role: 'admin',
      stats: { propietarios, establecimientos, caballos },
      recent_events: recentEvents,
    };
  }

  private async getPropietarioDashboard(userId: string) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [horses, recentEvents, monthlySpend] = await Promise.all([
      this.horseRepository.find({
        where: { owner_id: userId },
        relations: ['breed', 'activity', 'establishment'],
        order: { created_at: 'DESC' },
      }),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .where('horse.owner_id = :uid', { uid: userId })
        .orderBy('e.date', 'DESC')
        .limit(10)
        .getMany(),
      this.eventRepository
        .createQueryBuilder('e')
        .select('SUM(e.amount)', 'total')
        .leftJoin('e.horse', 'horse')
        .where('horse.owner_id = :uid', { uid: userId })
        .andWhere('e.type = :type', { type: 'gasto' })
        .andWhere('e.date >= :from', { from: firstOfMonth })
        .andWhere('e.amount IS NOT NULL')
        .getRawOne<{ total: string | null }>(),
    ]);

    return {
      role: 'propietario',
      horses,
      recent_events: recentEvents,
      monthly_spend: parseFloat(monthlySpend?.total ?? '0') || 0,
    };
  }

  private async getEstablecimientoDashboard(userId: string) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [horses, recentEvents, monthlyEvents] = await Promise.all([
      this.horseRepository.find({
        where: { establishment_id: userId },
        relations: ['owner', 'breed', 'activity'],
        order: { created_at: 'DESC' },
      }),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .addSelect(['horse.id', 'horse.name'])
        .where('horse.establishment_id = :uid', { uid: userId })
        .orderBy('e.date', 'DESC')
        .limit(10)
        .getMany(),
      this.eventRepository
        .createQueryBuilder('e')
        .leftJoin('e.horse', 'horse')
        .where('horse.establishment_id = :uid', { uid: userId })
        .andWhere('e.date >= :from', { from: firstOfMonth })
        .getCount(),
    ]);

    return {
      role: 'establecimiento',
      horses,
      recent_events: recentEvents,
      monthly_events_count: monthlyEvents,
    };
  }

  private async getVeterinarioDashboard(userId: string) {
    const assignments: { horse_id: string }[] = await this.userRepository.query(
      `SELECT horse_id FROM horse_users WHERE user_id = $1 AND role = 'vet'`,
      [userId],
    );
    const horseIds = assignments.map((a) => a.horse_id);

    if (!horseIds.length) {
      return {
        role: 'veterinario', horses: [], recent_health_events: [],
        upcoming_medical: [], total_horses: 0, total_salud_events: 0,
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysISO = in30Days.toISOString().split('T')[0];

    const [horses, recentHealthEvents, upcomingMedical, totalSalud] = await Promise.all([
      this.horseRepository.find({
        where: horseIds.map((id) => ({ id })),
        relations: ['owner', 'breed', 'activity'],
        order: { name: 'ASC' },
      }),
      this.eventRepository
        .createQueryBuilder('e')
        .where('e.horse_id IN (:...ids)', { ids: horseIds })
        .andWhere("e.type = 'salud'")
        .andWhere('e.deleted_at IS NULL')
        .orderBy('e.date', 'DESC')
        .limit(8)
        .getMany(),
      this.medicalRepository
        .createQueryBuilder('m')
        .where('m.horse_id IN (:...ids)', { ids: horseIds })
        .andWhere('m.next_due IS NOT NULL')
        .andWhere('m.next_due >= :today', { today })
        .andWhere('m.next_due <= :in30Days', { in30Days: in30DaysISO })
        .orderBy('m.next_due', 'ASC')
        .limit(10)
        .getMany(),
      this.eventRepository
        .createQueryBuilder('e')
        .where('e.horse_id IN (:...ids)', { ids: horseIds })
        .andWhere("e.type = 'salud'")
        .andWhere('e.deleted_at IS NULL')
        .getCount(),
    ]);

    return {
      role: 'veterinario',
      total_horses: horseIds.length,
      total_salud_events: totalSalud,
      horses,
      recent_health_events: recentHealthEvents,
      upcoming_medical: upcomingMedical,
    };
  }
}
