import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalRecord } from './medical-record.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';

@Injectable()
export class MedicalService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordRepository: Repository<MedicalRecord>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
  ) {}

  async findByHorse(horseId: string, user: User): Promise<MedicalRecord[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    return this.recordRepository.find({
      where: { horse_id: horseId },
      order: { date: 'DESC' },
    });
  }

  async create(horseId: string, dto: CreateMedicalRecordDto, user: User): Promise<MedicalRecord> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    return this.recordRepository.save(
      this.recordRepository.create({
        horse_id: horseId,
        type: dto.type,
        name: dto.name,
        date: dto.date,
        next_due: dto.next_due ?? null,
        brand: dto.brand ?? null,
        batch: dto.batch ?? null,
        notes: dto.notes ?? null,
        recorded_by: user.id,
      }),
    );
  }

  async remove(horseId: string, recordId: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const record = await this.recordRepository.findOne({ where: { id: recordId, horse_id: horseId } });
    if (!record) throw new NotFoundException('Registro no encontrado');
    await this.recordRepository.remove(record);
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
