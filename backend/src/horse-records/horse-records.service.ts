import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorseRecord, RecordSource } from './horse-record.entity';
import { HorseOwnershipClaim, FraudSignal, FraudRisk } from './horse-ownership-claim.entity';
import { Horse } from '../horses/horse.entity';
import { CatalogItem } from '../catalog-items/catalog-item.entity';
import { HorseRecordsScrapingService } from './horse-records-scraping.service';
import { SearchRecordsDto } from './dto/search-records.dto';
import { SubmitClaimDto } from './dto/submit-claim.dto';
import { fuzzyMatchNames } from './scrapers/base-record-scraper';

// Fuentes del Padrón que mapean directamente al enum de Horse
const HORSE_REGISTRATION_SOURCE: Partial<Record<RecordSource, Horse['registration_source']>> = {
  studbook_ar: 'studbook_ar',
  sra: 'sra',
  aqha: 'aqha',
};

// ─── Decisión de aprobación ────────────────────────────────────────────────────
// No usamos un umbral numérico arbitrario — evaluamos la calidad de evidencia.
//
// Jerarquía de evidencia:
//  1. Número de registro exacto  → identificador único oficial, prueba definitiva
//  2. Documento + fecha exacta   → dos pruebas independientes, alta confianza
//  3. Documento solo             → una prueba, confiable pero auditable
//  4. Fecha solo                 → una prueba débil, auditable
//  5. Solo microchip / nada      → insuficiente, requiere revisión humana
//
// El admin no "aprueba" el flujo normal; su rol es auditar y revocar fraudes.

type ApprovalOutcome = {
  status: HorseOwnershipClaim['status'];
  needsAudit: boolean;
  approvalReason: string;
};

function decideApproval(matched: string[], dto: SubmitClaimDto): ApprovalOutcome {
  // Para el número de registro: solo vale si el dato coincidió con el registro oficial
  const hasRegMatch   = matched.includes('registration_number');
  // Para el resto: evaluamos si el usuario proveyó el dato (presencia, no coincidencia)
  // El match contra DB es secundario — lo que importa es que el usuario tiene algo que presentar
  const hasDoc        = !!dto.document_url;
  const hasDate       = !!dto.claimed_birth_date;
  const hasMicrochip  = !!dto.microchip;

  // Número de registro coincide → identificador único, aprobación definitiva sin auditoría
  if (hasRegMatch) {
    return { status: 'auto_approved', needsAudit: false, approvalReason: 'registration_number_match' };
  }

  // Documento + fecha → dos pruebas independientes, aprobación sin auditoría
  if (hasDoc && hasDate) {
    return { status: 'auto_approved', needsAudit: false, approvalReason: 'doc_plus_birthdate' };
  }

  // Documento solo → una prueba física, aprobación pero auditable asincrónicamente
  if (hasDoc) {
    return { status: 'auto_approved', needsAudit: true, approvalReason: 'doc_only' };
  }

  // Fecha sola → una prueba débil, aprobación pero auditable
  if (hasDate) {
    return { status: 'auto_approved', needsAudit: true, approvalReason: 'birthdate_only' };
  }

  // Solo microchip → no es verificable contra DB, requiere revisión humana
  if (hasMicrochip) {
    return { status: 'pending', needsAudit: false, approvalReason: 'microchip_only_pending' };
  }

  // Sin evidencia → pendiente
  return { status: 'pending', needsAudit: false, approvalReason: 'no_evidence_pending' };
}

function calcFraudRisk(signals: FraudSignal[]): FraudRisk {
  const total = signals.reduce((s, f) => s + f.weight, 0);
  if (total === 0) return 'none';
  if (total <= 2) return 'low';
  if (total <= 4) return 'medium';
  return 'high';
}

@Injectable()
export class HorseRecordsService {
  private readonly logger = new Logger(HorseRecordsService.name);

  constructor(
    @InjectRepository(HorseRecord)
    private readonly recordRepo: Repository<HorseRecord>,
    @InjectRepository(HorseOwnershipClaim)
    private readonly claimRepo: Repository<HorseOwnershipClaim>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    @InjectRepository(CatalogItem)
    private readonly catalogRepo: Repository<CatalogItem>,
    private readonly scraping: HorseRecordsScrapingService,
  ) {}

  // ─── Búsqueda para el flujo de registro de caballo ──────────────────────
  async search(dto: SearchRecordsDto): Promise<{ items: HorseRecord[]; total: number }> {
    if (!dto.name?.trim()) {
      const [items, total] = await this.recordRepo.findAndCount({
        where: [{ scrape_status: 'done' }, { scrape_status: 'pending' }],
        order: { name: 'ASC' },
        take: dto.limit,
        skip: dto.offset,
      });
      return { items, total };
    }

    const qb = this.recordRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.verified_owner', 'owner')
      .where('r.name ILIKE :name', { name: `%${dto.name.trim()}%` });

    if (dto.birth_year) qb.andWhere('r.birth_year = :y', { y: dto.birth_year });
    if (dto.country_code) qb.andWhere('r.country_code = :c', { c: dto.country_code.toUpperCase() });
    if (dto.breed) qb.andWhere('r.breed ILIKE :b', { b: `%${dto.breed}%` });

    const candidates = await qb.limit(100).getMany();

    // Re-rank: exact matches first, then fuzzy
    const exact = candidates.filter(c => c.name.toUpperCase() === dto.name!.trim().toUpperCase());
    const fuzzy = candidates.filter(c =>
      c.name.toUpperCase() !== dto.name!.trim().toUpperCase() &&
      fuzzyMatchNames(c.name, dto.name!),
    );
    const rest = candidates.filter(c =>
      !exact.includes(c) && !fuzzy.includes(c),
    );

    const sorted = [...exact, ...fuzzy, ...rest];
    const total = sorted.length;
    const items = sorted.slice(dto.offset ?? 0, (dto.offset ?? 0) + (dto.limit ?? 20));

    return { items, total };
  }

  // ─── Ficha individual con padres ─────────────────────────────────────────
  async findOne(id: string): Promise<HorseRecord> {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['sire', 'dam', 'verified_owner'],
    });
    if (!record) throw new NotFoundException(`horse_record ${id} not found`);
    return record;
  }

  // ─── Árbol genealógico recursivo (máx depth niveles) ────────────────────
  async getTree(id: string, depth = 4): Promise<HorseRecordNode> {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['sire', 'dam', 'verified_owner'],
    });
    if (!record) throw new NotFoundException(`horse_record ${id} not found`);
    return this.buildNode(record, depth);
  }

  private async buildNode(record: HorseRecord, depth: number): Promise<HorseRecordNode> {
    const node: HorseRecordNode = {
      id: record.id,
      name: record.name,
      birth_year: record.birth_year,
      sex: record.sex,
      color: record.color,
      country_code: record.country_code,
      ownership_status: record.ownership_status,
      verified_owner: record.verified_owner
        ? { id: record.verified_owner.id, name: (record.verified_owner as any).name ?? '' }
        : null,
      sire: null,
      dam: null,
    };

    if (depth <= 0) return node;

    if (record.sire_id) {
      const sire = await this.recordRepo.findOne({
        where: { id: record.sire_id },
        relations: ['verified_owner'],
      });
      if (sire) node.sire = await this.buildNode(sire, depth - 1);
    } else if (record.sire_name) {
      node.sire = { id: null, name: record.sire_name, birth_year: null, sex: null, color: null, country_code: null, ownership_status: 'unverified', verified_owner: null, sire: null, dam: null };
    }

    if (record.dam_id) {
      const dam = await this.recordRepo.findOne({
        where: { id: record.dam_id },
        relations: ['verified_owner'],
      });
      if (dam) node.dam = await this.buildNode(dam, depth - 1);
    } else if (record.dam_name) {
      node.dam = { id: null, name: record.dam_name, birth_year: null, sex: null, color: null, country_code: null, ownership_status: 'unverified', verified_owner: null, sire: null, dam: null };
    }

    return node;
  }

  // ─── Descendientes directos de un caballo ───────────────────────────────
  async getProgeny(id: string): Promise<HorseRecord[]> {
    return this.recordRepo.find({
      where: [{ sire_id: id }, { dam_id: id }],
      relations: ['verified_owner'],
      order: { birth_year: 'ASC' },
      take: 100,
    });
  }

  // ─── Reclamar propiedad ──────────────────────────────────────────────────
  async submitClaim(dto: SubmitClaimDto, userId: string): Promise<HorseOwnershipClaim> {
    const record = await this.recordRepo.findOne({ where: { id: dto.horse_record_id } });
    if (!record) throw new NotFoundException('horse_record not found');

    if (record.ownership_status === 'verified') {
      throw new ConflictException('This horse already has a verified owner');
    }

    // Un usuario no puede tener dos claims activos del mismo caballo
    const existingActive = await this.claimRepo.findOne({
      where: { horse_record_id: dto.horse_record_id, claimant_id: userId, status: 'pending' },
    });
    if (existingActive) throw new ConflictException('You already have a pending claim for this horse');

    const { score, matched } = this.calcMatchScore(record, dto);
    const { status, needsAudit, approvalReason } = decideApproval(matched, dto);
    const fraudSignals = await this.computeFraudSignals(dto, userId, matched, record);
    const fraudRisk = calcFraudRisk(fraudSignals);

    const claim = this.claimRepo.create({
      horse_record_id: dto.horse_record_id,
      claimant_id: userId,
      registration_number: dto.registration_number ?? null,
      microchip: dto.microchip ?? null,
      claimed_birth_date: dto.claimed_birth_date ?? null,
      document_url: dto.document_url ?? null,
      document_public_id: dto.document_public_id ?? null,
      match_score: score,
      matched_fields: matched,
      status,
      needs_audit: needsAudit || fraudRisk === 'high',
      fraud_signals: fraudSignals.length ? fraudSignals : null,
      fraud_risk: fraudRisk,
    });

    const saved = await this.claimRepo.save(claim);

    if (saved.status === 'auto_approved') {
      await this.applyVerification(record, userId, saved.id);
      this.logger.log(
        `Auto-approved claim for ${record.name} (user ${userId}) · reason: ${approvalReason} · fraud: ${fraudRisk}`,
      );
    } else {
      await this.recordRepo.update(record.id, { ownership_status: 'pending_claim' });
      this.logger.log(
        `Claim pending: ${record.name} (user ${userId}) · reason: ${approvalReason} · fraud: ${fraudRisk}`,
      );
    }

    return saved;
  }

  // ─── Detección de señales de fraude ─────────────────────────────────────
  private async computeFraudSignals(
    dto: SubmitClaimDto,
    userId: string,
    matched: string[],
    record: HorseRecord,
  ): Promise<FraudSignal[]> {
    const signals: FraudSignal[] = [];
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Velocidad: más de 3 claims en las últimas 24 horas
    const recentCount = await this.claimRepo.count({
      where: { claimant_id: userId },
    });
    // Contar solo los recientes con query builder
    const recent24h = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.claimant_id = :uid', { uid: userId })
      .andWhere('c.created_at >= :since', { since: since24h })
      .getCount();
    if (recent24h >= 3) {
      signals.push({
        key: 'velocity',
        weight: 2,
        detail: `${recent24h} claims enviados en las últimas 24 horas`,
      });
    }

    // 2. Claim en competencia: otro usuario ya tiene un claim activo del mismo caballo
    const competing = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.horse_record_id = :hid', { hid: dto.horse_record_id })
      .andWhere('c.claimant_id != :uid', { uid: userId })
      .andWhere('c.status IN (:...statuses)', { statuses: ['pending', 'auto_approved', 'approved'] })
      .getCount();
    if (competing > 0) {
      signals.push({
        key: 'competing_claim',
        weight: 3,
        detail: `Existe otro claim activo de este caballo por un usuario diferente`,
      });
    }

    // 3. Reutilización de documento: mismo doc_url en un claim diferente
    if (dto.document_url) {
      const docReuse = await this.claimRepo
        .createQueryBuilder('c')
        .where('c.document_url = :url', { url: dto.document_url })
        .andWhere('c.claimant_id != :uid', { uid: userId })
        .getCount();
      if (docReuse > 0) {
        signals.push({
          key: 'doc_reuse',
          weight: 3,
          detail: 'El mismo documento fue utilizado en otro claim por un usuario diferente',
        });
      }
    }

    // 4. Intento fallido previo: el usuario ya tuvo un claim rechazado de este caballo
    const prevRejected = await this.claimRepo.findOne({
      where: { horse_record_id: dto.horse_record_id, claimant_id: userId, status: 'rejected' },
    });
    if (prevRejected) {
      signals.push({
        key: 'repeated_attempt',
        weight: 2,
        detail: `Claim previo rechazado para este caballo (${new Date(prevRejected.created_at).toLocaleDateString('es-AR')})`,
      });
    }

    // 5. Número de registro incorrecto: el usuario proporcionó uno que no matcheó
    if (dto.registration_number && !matched.includes('registration_number') && record.registration_number) {
      signals.push({
        key: 'registration_mismatch',
        weight: 2,
        detail: `Número de registro provisto (${dto.registration_number}) no coincide con el registro oficial`,
      });
    }

    // 6. Volumen histórico alto: el usuario tiene muchos claims en total (posible reclamador masivo)
    if (recentCount >= 10) {
      signals.push({
        key: 'high_volume_claimer',
        weight: 1,
        detail: `El usuario tiene ${recentCount} claims históricos en total`,
      });
    }

    return signals;
  }

  // ─── Auditoría admin: claims que requieren revisión ─────────────────────
  async getAuditQueue(limit = 50, offset = 0): Promise<{ items: HorseOwnershipClaim[]; total: number }> {
    const [items, total] = await this.claimRepo.findAndCount({
      where: [
        { needs_audit: true },
        { fraud_risk: 'medium' as FraudRisk },
        { fraud_risk: 'high' as FraudRisk },
      ],
      relations: ['horse_record', 'claimant'],
      order: { fraud_risk: 'DESC', created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  // ─── Admin: revocar un claim auto-aprobado ───────────────────────────────
  async revokeClaim(claimId: string, adminId: string, reason: string): Promise<HorseOwnershipClaim> {
    const claim = await this.claimRepo.findOne({
      where: { id: claimId },
      relations: ['horse_record'],
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'auto_approved' && claim.status !== 'approved') {
      throw new ForbiddenException('Solo se pueden revocar claims aprobados');
    }

    // Revertir propiedad en el horse_record
    await this.recordRepo.update(claim.horse_record_id, {
      verified_owner_id: null,
      verified_at: null,
      ownership_status: 'unverified',
    });

    // Marcar el Horse vinculado como sin dueño (no lo elimina, lo desvincula)
    const linkedHorse = await this.horseRepo.findOne({ where: { horse_record_id: claim.horse_record_id } });
    if (linkedHorse && linkedHorse.owner_id === claim.claimant_id) {
      await this.horseRepo.delete(linkedHorse.id);
      this.logger.log(`Deleted horse ${linkedHorse.id} after claim revocation`);
    }

    await this.claimRepo.update(claimId, {
      status: 'rejected',
      reviewed_by_id: adminId,
      reviewed_at: new Date(),
      rejection_reason: `[REVOCADO] ${reason}`,
      needs_audit: false,
    });

    this.logger.warn(`Claim ${claimId} revoked by admin ${adminId}: ${reason}`);
    return this.claimRepo.findOne({ where: { id: claimId } }) as Promise<HorseOwnershipClaim>;
  }

  // ─── Admin: aprobar claim ────────────────────────────────────────────────
  async approveClaim(claimId: string, adminId: string): Promise<HorseOwnershipClaim> {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status === 'approved' || claim.status === 'auto_approved') {
      throw new ConflictException('Claim already approved');
    }

    const record = await this.recordRepo.findOne({ where: { id: claim.horse_record_id } });
    if (!record) throw new NotFoundException('horse_record not found');

    await this.applyVerification(record, claim.claimant_id, claimId);

    await this.claimRepo.update(claimId, {
      status: 'approved',
      reviewed_by_id: adminId,
      reviewed_at: new Date(),
    });

    return this.claimRepo.findOne({ where: { id: claimId } }) as Promise<HorseOwnershipClaim>;
  }

  // ─── Admin: rechazar claim ───────────────────────────────────────────────
  async rejectClaim(claimId: string, adminId: string, reason: string): Promise<HorseOwnershipClaim> {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status === 'approved' || claim.status === 'auto_approved') {
      throw new ForbiddenException('Cannot reject an already-approved claim');
    }

    await this.claimRepo.update(claimId, {
      status: 'rejected',
      reviewed_by_id: adminId,
      reviewed_at: new Date(),
      rejection_reason: reason,
    });

    // Si era el único claim pendiente, resetear el estado del record
    const otherPending = await this.claimRepo.count({
      where: { horse_record_id: claim.horse_record_id, status: 'pending' },
    });
    if (otherPending === 0) {
      await this.recordRepo.update(claim.horse_record_id, { ownership_status: 'unverified' });
    }

    return this.claimRepo.findOne({ where: { id: claimId } }) as Promise<HorseOwnershipClaim>;
  }

  // ─── Claims pendientes (para panel admin) ───────────────────────────────
  async getPendingClaims(limit = 50, offset = 0): Promise<{ items: HorseOwnershipClaim[]; total: number }> {
    const [items, total] = await this.claimRepo.findAndCount({
      where: { status: 'pending' },
      relations: ['horse_record', 'claimant'],
      order: { created_at: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  // ─── Claims de un usuario ────────────────────────────────────────────────
  async getUserClaims(userId: string): Promise<HorseOwnershipClaim[]> {
    return this.claimRepo.find({
      where: { claimant_id: userId },
      relations: ['horse_record'],
      order: { created_at: 'DESC' },
    });
  }

  // ─── Stats generales (para dashboard admin) ─────────────────────────────
  async getStats() {
    const [scrapeStats, totalVerified, pendingClaims] = await Promise.all([
      this.scraping.getQueueStats(),
      this.recordRepo.count({ where: { ownership_status: 'verified' } }),
      this.claimRepo.count({ where: { status: 'pending' } }),
    ]);
    return { ...scrapeStats, verified_owners: totalVerified, pending_claims: pendingClaims };
  }

  // ─── Helpers privados ────────────────────────────────────────────────────

  private async applyVerification(record: HorseRecord, userId: string, _claimId: string): Promise<void> {
    await this.recordRepo.update(record.id, {
      verified_owner_id: userId,
      verified_at: new Date(),
      ownership_status: 'verified',
    });

    // Rechazar otros claims pendientes del mismo caballo
    await this.claimRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'rejected', rejection_reason: 'Another claim was approved for this horse' })
      .where('horse_record_id = :hid AND status = :s', { hid: record.id, s: 'pending' })
      .execute();

    // Crear Horse en HandicApp si todavía no existe uno vinculado a este registro
    const existing = await this.horseRepo.findOne({ where: { horse_record_id: record.id } });
    if (!existing) {
      await this.createHorseFromRecord(record, userId);
    } else if (existing.owner_id !== userId) {
      // El registro existía pero con otro dueño — transferir propiedad
      await this.horseRepo.update(existing.id, { owner_id: userId });
      this.logger.log(`Transferred horse ${existing.id} ownership to user ${userId} via claim`);
    }
  }

  private async createHorseFromRecord(record: HorseRecord, ownerId: string): Promise<Horse> {
    // Intentar resolver el breed_id buscando en catalog_items
    let breedId: string | null = null;
    if (record.breed) {
      const item = await this.catalogRepo.findOne({
        where: { type: 'breed', name: record.breed },
      });
      if (!item) {
        // Búsqueda case-insensitive parcial
        const items = await this.catalogRepo
          .createQueryBuilder('c')
          .where('c.type = :cat', { cat: 'breed' })
          .andWhere('LOWER(c.name) LIKE LOWER(:name)', { name: `%${record.breed}%` })
          .limit(1)
          .getMany();
        breedId = items[0]?.id ?? null;
      } else {
        breedId = item.id;
      }
    }

    const birthDate = record.birth_date ?? (record.birth_year ? `${record.birth_year}-01-01` : null);
    const regSource = record.registration_source
      ? (HORSE_REGISTRATION_SOURCE[record.registration_source] ?? 'other')
      : null;

    const horse = this.horseRepo.create({
      name: record.name,
      owner_id: ownerId,
      birth_date: birthDate,
      sex: record.sex,
      color: record.color,
      registration_number: record.registration_number,
      registration_source: regSource,
      breed_id: breedId,
      horse_record_id: record.id,
    });

    const saved = await this.horseRepo.save(horse);
    this.logger.log(`Created horse ${saved.id} (${saved.name}) for user ${ownerId} from record ${record.id}`);
    return saved;
  }

  private calcMatchScore(record: HorseRecord, dto: SubmitClaimDto): { score: number; matched: string[] } {
    const matched: string[] = [];
    let points = 0;
    const max = 100;

    // registration_number: 40 pts (campo más definitivo)
    if (dto.registration_number && record.registration_number) {
      const norm = (s: string) => s.replace(/[\s\-]/g, '').toUpperCase();
      if (norm(dto.registration_number) === norm(record.registration_number)) {
        matched.push('registration_number');
        points += 40;
      }
    }

    // birth_date: 30 pts
    if (dto.claimed_birth_date && record.birth_date) {
      if (dto.claimed_birth_date.slice(0, 10) === record.birth_date.slice(0, 10)) {
        matched.push('birth_date');
        points += 30;
      }
    } else if (dto.claimed_birth_date && record.birth_year) {
      const year = parseInt(dto.claimed_birth_date.slice(0, 4), 10);
      if (year === record.birth_year) {
        matched.push('birth_year');
        points += 15;
      }
    }

    // document uploaded: 20 pts (documento físico adjunto, revisión admin necesaria)
    if (dto.document_url) {
      matched.push('document_uploaded');
      points += 20;
    }

    // microchip: 10 pts (validación parcial — no tenemos chip en la DB scraped)
    if (dto.microchip) {
      matched.push('microchip_provided');
      points += 10;
    }

    return { score: Math.min(points, max), matched };
  }
}

export interface HorseRecordNode {
  id: string | null;
  name: string;
  birth_year: number | null;
  sex: 'macho' | 'hembra' | 'castrado' | null;
  color: string | null;
  country_code: string | null;
  ownership_status: string;
  verified_owner: { id: string; name: string } | null;
  sire: HorseRecordNode | null;
  dam: HorseRecordNode | null;
}
