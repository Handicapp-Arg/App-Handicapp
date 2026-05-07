import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardingRequest } from './boarding-request.entity';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class BoardingRequestsService {
  constructor(
    @InjectRepository(BoardingRequest)
    private readonly repo: Repository<BoardingRequest>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(
    dto: { horse_id: string; establishment_id: string; message?: string },
    requester: User,
  ): Promise<BoardingRequest> {
    if (requester.role !== 'propietario' && requester.role !== 'admin') {
      throw new ForbiddenException('Solo los propietarios pueden solicitar alojamiento');
    }

    const horse = await this.horseRepo.findOne({ where: { id: dto.horse_id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    if (horse.owner_id !== requester.id && requester.role !== 'admin') {
      throw new ForbiddenException('Solo podés solicitar alojamiento para tus propios caballos');
    }
    if (horse.establishment_id === dto.establishment_id) {
      throw new BadRequestException('El caballo ya está alojado en este establecimiento');
    }

    const existing = await this.repo.findOne({
      where: { horse_id: dto.horse_id, establishment_id: dto.establishment_id, status: 'pending' },
    });
    if (existing) throw new BadRequestException('Ya existe una solicitud pendiente para este caballo en este establecimiento');

    const request = await this.repo.save(
      this.repo.create({
        horse_id: dto.horse_id,
        establishment_id: dto.establishment_id,
        requester_id: requester.id,
        status: 'pending',
        message: dto.message ?? null,
      }),
    );

    // Notificar al establecimiento
    const notification = await this.notificationsService.create({
      type: NotificationType.EVENT_CREATED,
      title: '🏠 Nueva solicitud de alojamiento',
      message: `${requester.name} solicita alojar a ${horse.name} en tu establecimiento.`,
      recipient_id: dto.establishment_id,
    });
    await this.gateway.sendToUser(dto.establishment_id, notification);

    return this.repo.findOne({ where: { id: request.id }, relations: ['horse', 'requester', 'establishment'] }) as Promise<BoardingRequest>;
  }

  async findMine(user: User): Promise<BoardingRequest[]> {
    const qb = this.repo.createQueryBuilder('br')
      .leftJoinAndSelect('br.horse', 'horse')
      .leftJoinAndSelect('br.requester', 'requester')
      .leftJoinAndSelect('br.establishment', 'establishment')
      .orderBy('br.created_at', 'DESC');

    if (user.role === 'propietario') {
      qb.where('br.requester_id = :uid', { uid: user.id });
    } else if (user.role === 'establecimiento') {
      qb.where('br.establishment_id = :uid', { uid: user.id });
    } else if (user.role === 'admin') {
      // admin ve todas
    }

    return qb.getMany();
  }

  async accept(id: string, user: User): Promise<BoardingRequest> {
    const request = await this.repo.findOne({
      where: { id }, relations: ['horse', 'requester', 'establishment'],
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.establishment_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Solo el establecimiento puede aceptar esta solicitud');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue procesada');
    }

    // Vincular el caballo al establecimiento
    await this.horseRepo.update(request.horse_id, { establishment_id: request.establishment_id });
    await this.repo.update(id, { status: 'accepted' });

    // Notificar al propietario
    const notification = await this.notificationsService.create({
      type: NotificationType.EVENT_CREATED,
      title: '✅ Solicitud aceptada',
      message: `${request.establishment.name} aceptó alojar a ${request.horse.name}.`,
      recipient_id: request.requester_id,
    });
    await this.gateway.sendToUser(request.requester_id, notification);

    return { ...request, status: 'accepted' };
  }

  async reject(id: string, user: User): Promise<BoardingRequest> {
    const request = await this.repo.findOne({
      where: { id }, relations: ['horse', 'establishment'],
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.establishment_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Solo el establecimiento puede rechazar esta solicitud');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue procesada');
    }

    await this.repo.update(id, { status: 'rejected' });

    // Notificar al propietario
    const notification = await this.notificationsService.create({
      type: NotificationType.EVENT_CREATED,
      title: '❌ Solicitud rechazada',
      message: `${request.establishment.name} no aceptó la solicitud de alojamiento para ${request.horse.name}.`,
      recipient_id: request.requester_id,
    });
    await this.gateway.sendToUser(request.requester_id, notification);

    return { ...request, status: 'rejected' };
  }
}
