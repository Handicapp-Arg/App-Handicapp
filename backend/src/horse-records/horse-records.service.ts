import {
  Injectable, NotFoundException, ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorseRecord } from './horse-record.entity';
import { HorseOwnershipClaim } from './horse-ownership-claim.entity';
import { HorseRecordsScrapingService } from './horse-records-scraping.service';
import { SearchRecordsDto } from './dto/search-records.dto';
import { SubmitClaimDto } from './dto/submit-claim.dto';
import { fuzzyMatchNames } from './scrapers/base-record-scraper';

const AUTO_APPROVE_THRESHOLD = 80;

@Injectable()
export class HorseRecordsService {
  private readonly logger = new Logger(HorseRecordsService.name);

  constructor(
    @InjectRepository(HorseRecord)
    private readonly recordRepo: Repository<HorseRecord>,
    @InjectRepository(HorseOwnershipClaim)
    private readonly claimRepo: Repository<HorseOwnershipClaim>,
    private readonly scraping: HorseRecordsScrapingService,
  ) {}

  // ─── Búsqueda para el flujo de registro de caballo ──────────────────────
  async search(dto: SearchRecordsDto): Promise<{ items: HorseRecord[]; total: number }> {
    if (!dto.name?.trim()) {
      const [items, total] = await this.recordRepo.findAndCount({
        where: { scrape_status: 'done' },
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

    // Si no encontramos nada, encolamos scraping on-demand
    if (items.length === 0 && dto.name) {
      this.scraping.enqueueSearch(dto.name).catch(() => {});
    }

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
    const existing = await this.claimRepo.findOne({
      where: { horse_record_id: dto.horse_record_id, claimant_id: userId, status: 'pending' },
    });
    if (existing) throw new ConflictException('You already have a pending claim for this horse');

    // Calcular match_score automático
    const { score, matched } = this.calcMatchScore(record, dto);

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
      status: score >= AUTO_APPROVE_THRESHOLD ? 'auto_approved' : 'pending',
    });

    const saved = await this.claimRepo.save(claim);

    if (saved.status === 'auto_approved') {
      await this.applyVerification(record, userId, saved.id);
      this.logger.log(`Auto-approved claim for ${record.name} by user ${userId} (score: ${score})`);
    } else {
      await this.recordRepo.update(record.id, { ownership_status: 'pending_claim' });
      this.logger.log(`Claim pending review: ${record.name} by user ${userId} (score: ${score})`);
    }

    return saved;
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
