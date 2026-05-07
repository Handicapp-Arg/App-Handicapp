import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { MedicalRecord, MedicalRecordType } from './medical-record.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';

const TYPE_LABELS: Record<string, string> = {
  vacuna: 'Vacunas',
  desparasitacion: 'Desparasitaciones',
  analisis: 'Análisis / Laboratorio',
  tratamiento: 'Tratamientos',
};

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

  async generateMedicalPdf(horseId: string, user: User): Promise<{ pdf: Uint8Array; filename: string }> {
    const horse = await this.horseRepository.findOne({
      where: { id: horseId },
      relations: ['owner', 'establishment'],
    });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const records = await this.recordRepository.find({
      where: { horse_id: horseId },
      order: { date: 'DESC' },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const dark = rgb(0.06, 0.12, 0.24);
    const gray = rgb(0.42, 0.45, 0.50);
    const white = rgb(1, 1, 1);
    const green = rgb(0.05, 0.5, 0.24);

    // Header
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: dark });
    page.drawText('HandicApp', { x: 40, y: height - 38, size: 22, font: boldFont, color: white });
    page.drawText('Historial médico', { x: 40, y: height - 62, size: 11, font: regularFont, color: rgb(0.7, 0.75, 0.85) });

    const horseName = horse.name;
    const nameW = boldFont.widthOfTextAtSize(horseName, 16);
    page.drawText(horseName, { x: width - 40 - nameW, y: height - 42, size: 16, font: boldFont, color: white });
    const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    const dateW = regularFont.widthOfTextAtSize(dateStr, 9);
    page.drawText(dateStr, { x: width - 40 - dateW, y: height - 62, size: 9, font: regularFont, color: rgb(0.6, 0.7, 0.9) });

    let y = height - 110;

    // Datos del caballo
    if (horse.owner?.name) {
      page.drawText('Propietario:', { x: 40, y, size: 9, font: regularFont, color: gray });
      page.drawText(horse.owner.name, { x: 120, y, size: 9, font: boldFont, color: dark });
      y -= 14;
    }
    if (horse.establishment?.name) {
      page.drawText('Establecimiento:', { x: 40, y, size: 9, font: regularFont, color: gray });
      page.drawText(horse.establishment.name, { x: 120, y, size: 9, font: boldFont, color: dark });
      y -= 14;
    }

    y -= 10;
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) });
    y -= 18;

    if (records.length === 0) {
      page.drawText('Sin registros médicos.', { x: 40, y, size: 11, font: regularFont, color: gray });
    }

    // Agrupar por tipo
    const groups = Object.values(MedicalRecordType).map((type) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      items: records.filter((r) => r.type === type),
    })).filter((g) => g.items.length > 0);

    for (const group of groups) {
      if (y < 120) break;

      // Encabezado de sección
      page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 20, color: rgb(0.95, 0.97, 1) });
      page.drawText(group.label.toUpperCase(), { x: 44, y: y + 3, size: 9, font: boldFont, color: dark });
      y -= 24;

      for (const rec of group.items) {
        if (y < 80) break;
        const dateFormatted = new Date(rec.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
        page.drawText(rec.name, { x: 44, y, size: 10, font: boldFont, color: dark, maxWidth: 260 });
        page.drawText(dateFormatted, { x: 320, y, size: 9, font: regularFont, color: gray });
        if (rec.next_due) {
          const nextFormatted = new Date(rec.next_due + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
          page.drawText(`Próxima: ${nextFormatted}`, { x: 400, y, size: 9, font: regularFont, color: green });
        }
        y -= 14;
        if (rec.brand || rec.batch) {
          const detail = [rec.brand && `Marca: ${rec.brand}`, rec.batch && `Lote: ${rec.batch}`].filter(Boolean).join(' · ');
          page.drawText(detail, { x: 44, y, size: 8, font: regularFont, color: gray });
          y -= 12;
        }
        if (rec.notes) {
          page.drawText(rec.notes, { x: 44, y, size: 8, font: regularFont, color: gray, maxWidth: 500 });
          y -= 12;
        }
        y -= 4;
        page.drawLine({ start: { x: 44, y }, end: { x: width - 44, y }, thickness: 0.3, color: rgb(0.93, 0.93, 0.93) });
        y -= 10;
      }

      y -= 8;
    }

    page.drawText('Generado con HandicApp', { x: 40, y: 24, size: 8, font: regularFont, color: rgb(0.75, 0.75, 0.75) });

    const pdfBytes = await pdfDoc.save();
    const safeName = horse.name.replace(/[^a-zA-Z0-9]/g, '_');
    return { pdf: pdfBytes, filename: `historial-medico-${safeName}.pdf` };
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
