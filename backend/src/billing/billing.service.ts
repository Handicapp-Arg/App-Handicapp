import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
        currency: dto.currency ?? 'ARS',
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
      relations: ['horse', 'establishment', 'owner'],
    });
    if (!bill) throw new NotFoundException('Factura no encontrada');

    if (user.role === 'admin') return bill;
    if (expectedRole === 'any') {
      if (bill.establishment_id !== user.id && bill.owner_id !== user.id) {
        throw new ForbiddenException('No tenés acceso a esta factura');
      }
      return bill;
    }
    if (expectedRole === 'establecimiento' && bill.establishment_id !== user.id) {
      throw new ForbiddenException('No tenés acceso a esta factura');
    }
    if (expectedRole === 'propietario' && bill.owner_id !== user.id) {
      throw new ForbiddenException('No tenés acceso a esta factura');
    }
    return bill;
  }

  async generatePdf(id: string, user: User): Promise<{ pdf: Uint8Array; filename: string }> {
    const bill = await this.findOwned(id, user, 'any');
    const MONTH_NAMES_LOCAL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const dark = rgb(0.06, 0.12, 0.24); // #0f1f3d
    const gray = rgb(0.42, 0.45, 0.50);
    const lightGray = rgb(0.96, 0.97, 0.98);
    const white = rgb(1, 1, 1);

    // Header background
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: dark });

    // Título
    page.drawText('HandicApp', { x: 40, y: height - 38, size: 22, font: boldFont, color: white });
    page.drawText('Factura de pensión', { x: 40, y: height - 62, size: 11, font: regularFont, color: rgb(0.7, 0.75, 0.85) });

    // Mes/año en el header derecho
    const periodText = `${MONTH_NAMES_LOCAL[bill.month - 1]} ${bill.year}`;
    const periodW = boldFont.widthOfTextAtSize(periodText, 16);
    page.drawText(periodText, { x: width - 40 - periodW, y: height - 42, size: 16, font: boldFont, color: white });
    const statusText = bill.status.toUpperCase();
    const statusW = regularFont.widthOfTextAtSize(statusText, 10);
    page.drawText(statusText, { x: width - 40 - statusW, y: height - 62, size: 10, font: regularFont, color: rgb(0.6, 0.7, 0.9) });

    let y = height - 120;

    // Datos principales
    const drawLabel = (label: string, value: string, yPos: number) => {
      page.drawText(label, { x: 40, y: yPos, size: 9, font: regularFont, color: gray });
      page.drawText(value, { x: 40, y: yPos - 14, size: 11, font: boldFont, color: dark });
    };

    drawLabel('Establecimiento', bill.establishment?.name ?? '-', y);
    drawLabel('Propietario', bill.owner?.name ?? '-', y - 50);
    drawLabel('Caballo', bill.horse?.name ?? '-', y - 100);

    // Línea separadora
    y -= 140;
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    y -= 20;

    // Tabla de items
    page.drawText('Detalle', { x: 40, y, size: 10, font: boldFont, color: dark });
    page.drawText('Cant.', { x: 360, y, size: 10, font: boldFont, color: dark });
    page.drawText('P. Unit.', { x: 420, y, size: 10, font: boldFont, color: dark });
    page.drawText('Total', { x: 510, y, size: 10, font: boldFont, color: dark });
    y -= 6;
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 16;

    for (const item of bill.items) {
      if (y < 100) break;
      page.drawText(item.description, { x: 40, y, size: 10, font: regularFont, color: dark, maxWidth: 300 });
      page.drawText(String(item.quantity), { x: 360, y, size: 10, font: regularFont, color: dark });
      page.drawText(`${bill.currency} ${Number(item.unit_price).toLocaleString('es-AR')}`, { x: 400, y, size: 10, font: regularFont, color: dark });
      page.drawText(`${bill.currency} ${Number(item.total).toLocaleString('es-AR')}`, { x: 490, y, size: 10, font: regularFont, color: dark });
      y -= 20;
    }

    // Total
    y -= 10;
    page.drawRectangle({ x: 380, y: y - 8, width: width - 420, height: 30, color: dark });
    page.drawText('TOTAL', { x: 390, y: y + 5, size: 10, font: boldFont, color: white });
    page.drawText(`${bill.currency} ${Number(bill.total).toLocaleString('es-AR')}`, { x: 440, y: y + 5, size: 12, font: boldFont, color: white });

    // Footer
    if (bill.notes) {
      page.drawText('Notas:', { x: 40, y: 80, size: 9, font: boldFont, color: gray });
      page.drawText(bill.notes, { x: 40, y: 65, size: 9, font: regularFont, color: gray, maxWidth: 400 });
    }
    page.drawText('Generado con HandicApp', { x: 40, y: 30, size: 9, font: regularFont, color: rgb(0.75, 0.75, 0.75) });

    const pdfBytes = await pdfDoc.save();
    const filename = `factura-${bill.horse?.name ?? 'caballo'}-${MONTH_NAMES_LOCAL[bill.month - 1]}-${bill.year}.pdf`;
    return { pdf: pdfBytes, filename };
  }
}
