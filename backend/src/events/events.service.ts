import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event } from './event.entity';
import { EventPhoto } from './event-photo.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';
import { User } from '../auth/user.entity';
import { EventCreatedEvent } from '../notifications/events/event-created.event';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventPhoto)
    private readonly photoRepository: Repository<EventPhoto>,
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cloudinaryService: CloudinaryService,
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

    await this.assertAccess(horse, user);

    const event = this.eventRepository.create({
      ...dto,
      amount: dto.amount ? parseFloat(dto.amount) : null,
    });

    if (files?.length) {
      const uploaded = await Promise.all(
        files.map((file) => this.cloudinaryService.upload(file, 'handicapp/events')),
      );
      event.photos = uploaded.map((result) =>
        this.photoRepository.create({ url: result.secure_url, public_id: result.public_id }),
      );
    }

    const savedEvent = await this.eventRepository.save(event);

    this.eventEmitter.emit(
      'event.created',
      new EventCreatedEvent(savedEvent, horse, user),
    );

    return savedEvent;
  }

  async createBulk(dto: CreateBulkEventDto, user: User): Promise<Event[]> {
    const horses = await this.horseRepository.find({
      where: { id: In(dto.horse_ids) },
    });

    if (horses.length !== dto.horse_ids.length) {
      throw new NotFoundException('Uno o más caballos no encontrados');
    }

    for (const horse of horses) {
      await this.assertAccess(horse, user);
    }

    const amount = dto.amount ? parseFloat(dto.amount) : null;
    const saved: Event[] = [];

    for (const horse of horses) {
      const event = this.eventRepository.create({
        type: dto.type,
        description: dto.description,
        date: dto.date,
        horse_id: horse.id,
        amount,
      });

      const persisted = await this.eventRepository.save(event);

      this.eventEmitter.emit(
        'event.created',
        new EventCreatedEvent(persisted, horse, user),
      );

      saved.push(persisted);
    }

    return saved;
  }

  async findAllByUser(user: User): Promise<Event[]> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.photos', 'photos')
      .leftJoin('event.horse', 'horse')
      .addSelect(['horse.id', 'horse.name', 'horse.owner_id', 'horse.establishment_id'])
      .orderBy('event.date', 'DESC');

    if (user.role === 'propietario') {
      // Include events from owned horses and co-owned horses
      qb.leftJoin('horse.horseUsers', 'hu')
        .where('horse.owner_id = :uid OR (hu.user_id = :uid AND hu.role = :ownerRole)', {
          uid: user.id,
          ownerRole: 'owner',
        });
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

    await this.assertAccess(horse, user);

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

    await this.assertAccess(event.horse, user);

    return event;
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;

    if (
      user.role === 'propietario' &&
      horse.owner_id === user.id
    ) return;

    if (
      user.role === 'establecimiento' &&
      horse.establishment_id === user.id
    ) return;

    // Check if user is a co-owner
    const coOwner = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id, role: 'owner' },
    });
    if (coOwner) return;

    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
