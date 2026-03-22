import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity';
import { Horse } from '../horses/horse.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { User } from '../auth/user.entity';
import { RoleName } from '../roles/role.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
  ) {}

  async create(dto: CreateEventDto, user: User): Promise<Event> {
    const horse = await this.horseRepository.findOne({
      where: { id: dto.horse_id },
    });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    this.assertAccess(horse, user);

    const event = this.eventRepository.create(dto);
    return this.eventRepository.save(event);
  }

  async findByHorse(horseId: string, user: User): Promise<Event[]> {
    const horse = await this.horseRepository.findOne({
      where: { id: horseId },
    });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    this.assertAccess(horse, user);

    return this.eventRepository.find({
      where: { horse_id: horseId },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['horse'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    this.assertAccess(event.horse, user);

    return event;
  }

  private assertAccess(horse: Horse, user: User): void {
    if (user.role.name === RoleName.ADMIN) return;

    if (
      user.role.name === RoleName.PROPIETARIO &&
      horse.owner_id === user.id
    ) return;

    if (
      user.role.name === RoleName.ESTABLECIMIENTO &&
      horse.establishment_id === user.id
    ) return;

    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
