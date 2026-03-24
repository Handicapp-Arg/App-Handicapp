import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event } from './event.entity';
import { EventPhoto } from './event-photo.entity';
import { Horse } from '../horses/horse.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { User } from '../auth/user.entity';
import { EventCreatedEvent } from '../notifications/events/event-created.event';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventPhoto)
    private readonly photoRepository: Repository<EventPhoto>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateEventDto,
    user: User,
    files?: Express.Multer.File[],
  ): Promise<Event> {
    const horse = await this.horseRepository.findOne({
      where: { id: dto.horse_id },
    });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    this.assertAccess(horse, user);

    const event = this.eventRepository.create({
      ...dto,
      amount: dto.amount ? parseFloat(dto.amount) : null,
    });

    if (files?.length) {
      event.photos = files.map((file) =>
        this.photoRepository.create({ filename: file.filename }),
      );
    }

    const savedEvent = await this.eventRepository.save(event);

    this.eventEmitter.emit(
      'event.created',
      new EventCreatedEvent(savedEvent, horse, user),
    );

    return savedEvent;
  }

  async findAllByUser(user: User): Promise<Event[]> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.photos', 'photos')
      .leftJoin('event.horse', 'horse')
      .addSelect(['horse.id', 'horse.name', 'horse.owner_id', 'horse.establishment_id'])
      .orderBy('event.date', 'DESC');

    if (user.role === 'propietario') {
      qb.where('horse.owner_id = :uid', { uid: user.id });
    } else if (user.role === 'establecimiento') {
      qb.where('horse.establishment_id = :uid', { uid: user.id });
    }

    return qb.getMany();
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
      relations: ['photos'],
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['horse', 'photos'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    this.assertAccess(event.horse, user);

    return event;
  }

  private assertAccess(horse: Horse, user: User): void {
    if (user.role === 'admin') return;

    if (
      user.role === 'propietario' &&
      horse.owner_id === user.id
    ) return;

    if (
      user.role === 'establecimiento' &&
      horse.establishment_id === user.id
    ) return;

    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
