import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event, EventType } from './event.entity';
import { EventPhoto } from './event-photo.entity';
import { EventComment } from './event-comment.entity';
import { FeedPost } from '../feed/feed-post.entity';
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
    @InjectRepository(FeedPost)
    private readonly feedPostRepository: Repository<FeedPost>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Gating por rol: jinete solo registra entrenamientos, peón solo tareas.
  // Otros roles: sin restricción de tipo.
  private assertTypeAllowedForRole(type: EventType, user: User): void {
    if (user.role === 'jinete' && type !== EventType.ENTRENAMIENTO) {
      throw new BadRequestException(
        'El rol jinete solo puede registrar eventos de tipo entrenamiento',
      );
    }
    if (user.role === 'peon' && type !== EventType.TAREA) {
      throw new BadRequestException(
        'El rol peón solo puede registrar eventos de tipo tarea',
      );
    }
  }

  async create(
    dto: CreateEventDto,
    user: User,
    files?: Express.Multer.File[],
  ): Promise<Event> {
    this.assertTypeAllowedForRole(dto.type, user);

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
      author_id: user.id,
      is_public: dto.is_public ?? false,
    });

    if (files?.length) {
      const uploaded = await Promise.all(
        files.map((file) => {
          const isPdf = file.mimetype === 'application/pdf';
          const isVideo = file.mimetype.startsWith('video/');
          if (isVideo) {
            return this.cloudinaryService
              .uploadVideo(file, 'handicapp/events')
              .then((result) => ({ result, isPdf: false, isVideo: true }));
          }
          return this.cloudinaryService
            .upload(file, 'handicapp/events', { isPdf })
            .then((result) => ({ result, isPdf, isVideo: false }));
        }),
      );
      event.photos = uploaded.map(({ result, isPdf, isVideo }) =>
        this.photoRepository.create({
          url: result.secure_url,
          public_id: result.public_id,
          file_type: isVideo ? 'video' : isPdf ? 'pdf' : 'image',
        }),
      );
    }

    const savedEvent = await this.eventRepository.save(event);

    if (dto.recurrence_type && dto.recurrence_type !== 'none' && dto.recurrence_end) {
      const children = this.generateRecurrences(savedEvent, dto.recurrence_type, dto.recurrence_end);
      if (children.length) await this.eventRepository.save(children);
    }

    this.eventEmitter.emit(
      'event.created',
      new EventCreatedEvent(savedEvent, horse, user),
    );

    return savedEvent;
  }

  private generateRecurrences(
    parent: Event,
    recurrenceType: 'daily' | 'weekly' | 'biweekly' | 'monthly',
    recurrenceEnd: string,
  ): Event[] {
    const results: Event[] = [];
    const endDate = new Date(recurrenceEnd + 'T12:00:00');
    let current = new Date(parent.date + 'T12:00:00');
    const MAX = 52;

    const advance = (d: Date) => {
      const next = new Date(d);
      if (recurrenceType === 'daily') next.setDate(next.getDate() + 1);
      else if (recurrenceType === 'weekly') next.setDate(next.getDate() + 7);
      else if (recurrenceType === 'biweekly') next.setDate(next.getDate() + 14);
      else if (recurrenceType === 'monthly') next.setMonth(next.getMonth() + 1);
      return next;
    };

    current = advance(current);
    while (current <= endDate && results.length < MAX) {
      const dateStr = current.toISOString().split('T')[0];
      results.push(this.eventRepository.create({
        type: parent.type,
        description: parent.description,
        date: dateStr,
        event_time: parent.event_time,
        horse_id: parent.horse_id,
        author_id: parent.author_id,
        amount: parent.amount,
        currency: parent.currency,
        is_public: parent.is_public,
        recurrence_type: parent.recurrence_type,
        recurrence_end: parent.recurrence_end,
        recurrence_parent_id: parent.id,
      }));
      current = advance(current);
    }
    return results;
  }

  async createBulk(dto: CreateBulkEventDto, user: User): Promise<Event[]> {
    this.assertTypeAllowedForRole(dto.type, user);

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
    } else if (user.role === 'veterinario' || user.role === 'jinete' || user.role === 'peon') {
      // Roles de asignación: solo eventos de caballos asignados vía horse_users.
      qb.innerJoin('horse.horseUsers', 'hu2')
        .where('hu2.user_id = :uid', { uid: user.id });
    } else if (user.role === 'encargado') {
      // Encargado: eventos de los caballos de su(s) organización(es).
      const orgRows: { organization_id: string }[] = await this.eventRepository.query(
        'SELECT organization_id FROM organization_members WHERE user_id = $1',
        [user.id],
      );
      const orgIds = orgRows.map((r) => r.organization_id).filter((id) => id != null);
      if (orgIds.length) {
        qb.where('horse.organization_id IN (:...orgIds)', { orgIds });
      } else {
        qb.where('1 = 0'); // sin org → no ve nada
      }
    } else if (user.role !== 'admin') {
      // Cualquier otro rol no contemplado: no ver nada (evita fugas por fallthrough).
      qb.where('1 = 0');
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

    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.photos', 'photos')
      .where('event.horse_id = :horseId', { horseId })
      .orderBy('event.date', 'DESC');

    // Roles operativos (jinete/peon): no ven eventos financieros (gastos).
    if (user.role === 'jinete' || user.role === 'peon') {
      qb.andWhere("event.type != 'gasto'");
    }

    return qb.getMany();
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

  // ─── Compartir evento al feed ────────────────────────────────────────────
  async shareToFeed(eventId: string, user: User): Promise<FeedPost> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['horse', 'photos'],
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.assertAccess(event.horse, user);

    if (event.feed_post_id) {
      const existing = await this.feedPostRepository.findOne({ where: { id: event.feed_post_id } });
      if (existing) return existing;
    }

    const TYPE_LABELS: Record<string, string> = {
      salud: '🩺 Salud',
      entrenamiento: '🏇 Entrenamiento',
      gasto: '💰 Gasto',
      nota: '📝 Nota',
    };

    const content = `${TYPE_LABELS[event.type] ?? event.type} · ${event.horse.name}\n\n${event.description}`;
    const imageUrls = event.photos.filter(p => p.file_type === 'image').map(p => p.url);
    const videoUrls = event.photos.filter(p => p.file_type === 'video').map(p => p.url);

    const post = this.feedPostRepository.create({
      content,
      author_id: user.id,
      horse_id: event.horse_id,
      type: 'horse_update',
      image_urls: imageUrls.length ? imageUrls : null,
      video_urls: videoUrls.length ? videoUrls : null,
    });

    const saved = await this.feedPostRepository.save(post);
    await this.eventRepository.update(eventId, { feed_post_id: saved.id, is_public: true });
    return saved;
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

  // Histórico de entrenamientos de un caballo (modo jinete: ver progreso).
  // Lista los eventos tipo entrenamiento con sus métricas embebidas + resumen.
  async getTrainingHistory(
    horseId: string,
    user: User,
  ): Promise<{
    summary: { total_rides: number; km_this_month: number };
    items: Array<{
      id: string;
      date: string;
      event_time: string | null;
      description: string;
      author_name?: string;
      distance_km: number | null;
      duration_min: number | null;
      intensity: number | null;
      discipline: string | null;
    }>;
  }> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const rows = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin(TrainingMetrics, 'tm', 'tm.event_id = event.id')
      .leftJoin('event.author', 'author')
      .select('event.id', 'id')
      .addSelect('event.date', 'date')
      .addSelect('event.event_time', 'event_time')
      .addSelect('event.description', 'description')
      .addSelect('author.name', 'author_name')
      .addSelect('tm.distance_km', 'distance_km')
      .addSelect('tm.duration_min', 'duration_min')
      .addSelect('tm.intensity', 'intensity')
      .addSelect('tm.discipline', 'discipline')
      .where('event.horse_id = :horseId', { horseId })
      .andWhere('event.type = :type', { type: EventType.ENTRENAMIENTO })
      .andWhere('event.deleted_at IS NULL')
      .orderBy('event.date', 'DESC')
      .addOrderBy('event.event_time', 'DESC')
      .limit(50)
      .getRawMany();

    const items = rows.map((r) => ({
      id: r.id,
      date: r.date,
      event_time: r.event_time ?? null,
      description: r.description,
      author_name: r.author_name ?? undefined,
      distance_km: r.distance_km != null ? Number(r.distance_km) : null,
      duration_min: r.duration_min != null ? Number(r.duration_min) : null,
      intensity: r.intensity != null ? Number(r.intensity) : null,
      discipline: r.discipline ?? null,
    }));

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const agg = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin(TrainingMetrics, 'tm', 'tm.event_id = event.id')
      .select('COUNT(event.id)', 'total_rides')
      .addSelect(
        'COALESCE(SUM(CASE WHEN event.date >= :monthStart THEN tm.distance_km ELSE 0 END), 0)',
        'km_this_month',
      )
      .where('event.horse_id = :horseId', { horseId })
      .andWhere('event.type = :type', { type: EventType.ENTRENAMIENTO })
      .andWhere('event.deleted_at IS NULL')
      .setParameters({ horseId, type: EventType.ENTRENAMIENTO, monthStart })
      .getRawOne();

    return {
      summary: {
        total_rides: Number(agg?.total_rides ?? 0),
        km_this_month: Number(agg?.km_this_month ?? 0),
      },
      items,
    };
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
    if (dto.is_public !== undefined) event.is_public = dto.is_public;

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

    const isAuthor = comment.user_id === user.id;
    const isAdmin = user.role === 'admin';
    const isEstabWithAccess = user.role === 'establecimiento'
      && comment.event.horse.establishment_id === user.id;

    if (!isAuthor && !isAdmin && !isEstabWithAccess) {
      throw new ForbiddenException('No podés eliminar este comentario');
    }
    await this.commentRepository.delete(commentId);
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
