import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { Event } from '../events/event.entity';
import { MedicalRecord } from '../medical/medical-record.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepo: Repository<HorseUser>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRepo: Repository<MedicalRecord>,
  ) {}

  async search(q: string, user: User) {
    const accessibleHorseIds = await this.getAccessibleHorseIds(user);
    const pattern = `%${q}%`;

    const [horses, events, medical] = await Promise.all([
      this.horseRepo.createQueryBuilder('h')
        .leftJoinAndSelect('h.breed', 'breed')
        .leftJoinAndSelect('h.activity', 'activity')
        .where('h.id IN (:...ids)', { ids: accessibleHorseIds.length ? accessibleHorseIds : ['none'] })
        .andWhere('(h.name ILIKE :p OR h.microchip ILIKE :p)', { p: pattern })
        .andWhere('h.deleted_at IS NULL')
        .take(10)
        .getMany(),

      accessibleHorseIds.length
        ? this.eventRepo.createQueryBuilder('e')
          .where('e.horse_id IN (:...ids)', { ids: accessibleHorseIds })
          .andWhere('e.description ILIKE :p', { p: pattern })
          .andWhere('e.deleted_at IS NULL')
          .orderBy('e.date', 'DESC')
          .take(10)
          .getMany()
        : Promise.resolve([]),

      accessibleHorseIds.length
        ? this.medicalRepo.createQueryBuilder('m')
          .where('m.horse_id IN (:...ids)', { ids: accessibleHorseIds })
          .andWhere('(m.name ILIKE :p OR m.notes ILIKE :p OR m.brand ILIKE :p)', { p: pattern })
          .orderBy('m.date', 'DESC')
          .take(10)
          .getMany()
        : Promise.resolve([]),
    ]);

    return {
      horses: horses.map((h) => ({
        id: h.id, name: h.name, breed: h.breed?.name ?? null, activity: h.activity?.name ?? null, image_url: h.image_url,
      })),
      events: events.map((e) => ({
        id: e.id, horse_id: e.horse_id, type: e.type, description: e.description, date: e.date,
      })),
      medical: medical.map((m) => ({
        id: m.id, horse_id: m.horse_id, type: m.type, name: m.name, date: m.date, next_due: m.next_due,
      })),
    };
  }

  private async getAccessibleHorseIds(user: User): Promise<string[]> {
    if (user.role === 'admin') {
      const horses = await this.horseRepo.find({ select: ['id'], where: {} });
      return horses.map((h) => h.id);
    }
    if (user.role === 'propietario') {
      const horses = await this.horseRepo.find({ select: ['id'], where: { owner_id: user.id } });
      const shared = await this.horseUserRepo.find({ where: { user_id: user.id }, select: ['horse_id'] });
      const ids = new Set([...horses.map((h) => h.id), ...shared.map((hu) => hu.horse_id)]);
      return Array.from(ids);
    }
    if (user.role === 'establecimiento') {
      const horses = await this.horseRepo.find({ select: ['id'], where: { establishment_id: user.id } });
      return horses.map((h) => h.id);
    }
    // vet
    const assigned = await this.horseUserRepo.find({ where: { user_id: user.id }, select: ['horse_id'] });
    return assigned.map((hu) => hu.horse_id);
  }
}
