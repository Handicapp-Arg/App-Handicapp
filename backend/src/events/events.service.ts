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
import { EventComment } from './event-comment.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { TrainingMetrics } from './training-metrics.entity';
import { TrainingMetricsDto } from './dto/training-metrics.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
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
    @InjectRepository(TrainingMetrics)
    private readonly metricsRepository: Repository<TrainingMetrics>,
    @InjectRepository(EventComment)
    private readonly commentRepository: Repository<EventComment>,
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
      currency: dto.currency ?? 'ARS',
    });

    if (files?.length) {
      const uploaded = await Promise.all(
        files.map((file) => {
          const isPdf = file.mimetype === 'application/pdf';
          return this.cloudinaryService
            .upload(file, 'handicapp/events', { isPdf })
            .then((result) => ({ result, isPdf }));
        }),
      );
      event.photos = uploaded.map(({ result, isPdf }) =>
        this.photoRepository.create({
          url: result.secure_url,
          public_id: result.public_id,
          file_type: isPdf ? 'pdf' : 'image',
        }),
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

  async findAllByUser(
    user: User,
    query: EventsQueryDto = {},
  ): Promise<{ data: Event[]; total: number; page: number; limit: number }> {
    const { type, date_from, date_to, horse_id, page = 1, limit = 20 } = query;

    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.photos', 'photos')
      .leftJoin('event.horse', 'horse')
      .addSelect(['horse.id', 'horse.name', 'horse.owner_id', 'horse.establishment_id'])
      .orderBy('event.date', 'DESC')
      .addOrderBy('event.created_at', 'DESC');

    if (user.role === 'propietario') {
      qb.leftJoin('horse.horseUsers', 'hu')
        .where('horse.owner_id = :uid OR (hu.user_id = :uid AND hu.role = :ownerRole)', {
          uid: user.id,
          ownerRole: 'owner',
        });
    } else if (user.role === 'establecimiento') {
      qb.where('horse.establishment_id = :uid', { uid: user.id });
    } else if (user.role === 'veterinario') {
      qb.innerJoin('horse.horseUsers', 'hu2')
        .where('hu2.user_id = :uid', { uid: user.id });
    }

    if (type) qb.andWhere('event.type = :type', { type });
    if (date_from) qb.andWhere('event.date >= :date_from', { date_from });
    if (date_to) qb.andWhere('event.date <= :date_to', { date_to });
    if (horse_id) qb.andWhere('event.horse_id = :horse_id', { horse_id });

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return { data, total, page, limit };
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

  async upsertTrainingMetrics(eventId: string, dto: TrainingMetricsDto, user: User): Promise<TrainingMetrics> {
    const event = await this.eventRepository.findOne({ where: { id: eventId }, relations: ['horse'] });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.assertAccess(event.horse, user);

    const existing = await this.metricsRepository.findOne({ where: { event_id: eventId } });
    if (existing) {
      Object.assign(existing, {
        distance_km: dto.distance_km ?? existing.distance_km,
        duration_min: dto.duration_min ?? existing.duration_min,
        intensity: dto.intensity ?? existing.intensity,
        discipline: dto.discipline ?? existing.discipline,
      });
      return this.metricsRepository.save(existing);
    }

    return this.metricsRepository.save(
      this.metricsRepository.create({ event_id: eventId, ...dto }),
    );
  }

  async getTrainingMetrics(eventId: string, user: User): Promise<TrainingMetrics | null> {
    const event = await this.eventRepository.findOne({ where: { id: eventId }, relations: ['horse'] });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.assertAccess(event.horse, user);
    return this.metricsRepository.findOne({ where: { event_id: eventId } });
  }

  async update(id: string, dto: UpdateEventDto, user: User): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['horse'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    await this.assertAccess(event.horse, user);

    if (dto.type !== undefined) event.type = dto.type;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.date !== undefined) event.date = dto.date;
    if (dto.amount !== undefined) {
      event.amount = dto.amount ? parseFloat(dto.amount) : null;
    }
    if (dto.currency !== undefined) event.currency = dto.currency;

    return this.eventRepository.save(event);
  }

  async remove(id: string, user: User): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['horse'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    await this.assertAccess(event.horse, user);

    await this.eventRepository.softDelete(id);
  }

  async getComments(eventId: string, user: User): Promise<EventComment[]> {
    const event = await this.eventRepository.findOne({ where: { id: eventId }, relations: ['horse'] });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.assertAccess(event.horse, user);
    return this.commentRepository.find({
      where: { event_id: eventId },
      order: { created_at: 'ASC' },
    });
  }

  async addComment(eventId: string, text: string, user: User): Promise<EventComment> {
    const event = await this.eventRepository.findOne({ where: { id: eventId }, relations: ['horse'] });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.assertAccess(event.horse, user);
    const comment = this.commentRepository.create({ event_id: eventId, user_id: user.id, text });
    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: string, user: User): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId }, relations: ['event', 'event.horse'] });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.user_id !== user.id && user.role !== 'admin' && user.role !== 'establecimiento') {
      throw new ForbiddenException('No podés eliminar este comentario');
    }
    await this.commentRepository.delete(commentId);
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;
    if (user.role === 'propietario' && horse.owner_id === user.id) return;
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) return;

    // co-owner o veterinario asignado
    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id },
    });
    if (entry) return;

    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
