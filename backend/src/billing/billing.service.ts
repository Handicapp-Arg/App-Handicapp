import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill, BillStatus, BillItem } from './bill.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { User } from '../auth/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.entity';

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Bill)
    private readonly billRepository: Repository<Bill>,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async findByUser(user: User): Promise<Bill[]> {
    const qb = this.billRepository.createQueryBuilder('b')
      .leftJoinAndSelect('b.horse', 'horse')
      .orderBy('b.year', 'DESC')
      .addOrderBy('b.month', 'DESC');

    if (user.role === 'establecimiento') {
      qb.where('b.establishment_id = :uid', { uid: user.id });
    } else if (user.role === 'propietario') {
      qb.where('b.owner_id = :uid', { uid: user.id });
    } else if (user.role === 'admin') {
      // admin ve todo
    } else {
      return [];
    }

    return qb.getMany();
  }

  async create(dto: CreateBillDto, user: User): Promise<Bill> {
    if (user.role !== 'establecimiento' && user.role !== 'admin') {
      throw new ForbiddenException('Solo los establecimientos pueden generar facturas');
    }

    const items: BillItem[] = dto.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total: parseFloat((i.quantity * i.unit_price).toFixed(2)),
    }));

    const total = items.reduce((sum, i) => sum + i.total, 0);

    const bill = await this.billRepository.save(
      this.billRepository.create({
        horse_id: dto.horse_id,
        establishment_id: user.role === 'establecimiento' ? user.id : dto.owner_id,
        owner_id: dto.owner_id,
        month: dto.month,
        year: dto.year,
        items,
        total: parseFloat(total.toFixed(2)),
        notes: dto.notes ?? null,
        status: BillStatus.DRAFT,
      }),
    );

    return bill;
  }

  async send(id: string, user: User): Promise<Bill> {
    const bill = await this.findOwned(id, user, 'establecimiento');
    if (bill.status !== BillStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden enviar facturas en borrador');
    }
    bill.status = BillStatus.SENT;
    const saved = await this.billRepository.save(bill);

    const monthName = MONTH_NAMES[bill.month - 1];
    const notifications = await this.notificationsService.createMany([{
      type: NotificationType.HEALTH_REMINDER,
      title: `Nueva factura — ${bill.horse?.name ?? 'Caballo'}`,
      message: `Factura de ${monthName} ${bill.year} por $${bill.total.toLocaleString('es-AR')}. Revisala en la sección de facturación.`,
      recipient_id: bill.owner_id,
    }]);
    for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);

    return saved;
  }

  async approve(id: string, user: User): Promise<Bill> {
    const bill = await this.findOwned(id, user, 'propietario');
    if (bill.status !== BillStatus.SENT) {
      throw new BadRequestException('Solo se pueden aprobar facturas enviadas');
    }
    bill.status = BillStatus.APPROVED;
    return this.billRepository.save(bill);
  }

  async dispute(id: string, reason: string, user: User): Promise<Bill> {
    const bill = await this.findOwned(id, user, 'propietario');
    if (bill.status !== BillStatus.SENT) {
      throw new BadRequestException('Solo se pueden disputar facturas enviadas');
    }
    bill.status = BillStatus.DISPUTED;
    bill.dispute_reason = reason;
    const saved = await this.billRepository.save(bill);

    const notifications = await this.notificationsService.createMany([{
      type: NotificationType.HEALTH_REMINDER,
      title: `Factura disputada — ${bill.horse?.name ?? 'Caballo'}`,
      message: `El propietario disputó la factura. Motivo: ${reason}`,
      recipient_id: bill.establishment_id,
    }]);
    for (const n of notifications) this.gateway.sendToUser(n.recipient_id, n);

    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const bill = await this.findOwned(id, user, 'establecimiento');
    if (bill.status !== BillStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden eliminar facturas en borrador');
    }
    await this.billRepository.remove(bill);
  }

  private async findOwned(id: string, user: User, expectedRole: string): Promise<Bill> {
    const bill = await this.billRepository.findOne({
      where: { id },
      relations: ['horse'],
    });
    if (!bill) throw new NotFoundException('Factura no encontrada');

    if (user.role === 'admin') return bill;

    if (expectedRole === 'establecimiento' && bill.establishment_id !== user.id) {
      throw new ForbiddenException('No tenés acceso a esta factura');
    }
    if (expectedRole === 'propietario' && bill.owner_id !== user.id) {
      throw new ForbiddenException('No tenés acceso a esta factura');
    }
    return bill;
  }
}
