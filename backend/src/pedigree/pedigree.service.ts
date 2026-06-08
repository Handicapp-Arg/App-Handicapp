import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, Not } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { User } from '../auth/user.entity';
import { Pedigree, PedigreeValidation, PedigreeDocument, ValidationSource, ValidationStatus } from './entities/pedigree.entity';
import { CreatePedigreeDto, AdminResolveDto, UploadDocumentDto } from './dto/create-pedigree.dto';
import { PedigreeScrapingService } from './pedigree-scraping.service';

@Injectable()
export class PedigreeService {
  constructor(
    @InjectRepository(Pedigree)
    private readonly pedigreeRepo: Repository<Pedigree>,
    @InjectRepository(PedigreeValidation)
    private readonly validationRepo: Repository<PedigreeValidation>,
    @InjectRepository(PedigreeDocument)
    private readonly documentRepo: Repository<PedigreeDocument>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepo: Repository<HorseUser>,
    private readonly scrapingService: PedigreeScrapingService,
  ) {}

  async findByHorse(horseId: string, user: User): Promise<Pedigree | null> {
    await this.assertHorseAccess(horseId, user);
    return this.pedigreeRepo.findOne({
      where: { horse_id: horseId },
      relations: ['sire', 'dam', 'validations', 'documents'],
      order: { validations: { created_at: 'DESC' } },
    });
  }

  async upsert(horseId: string, dto: CreatePedigreeDto, user: User): Promise<Pedigree> {
    const horse = await this.assertHorseAccess(horseId, user);
    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException('Solo el propietario o un admin puede editar el pedigrí');
    }

    let pedigree = await this.pedigreeRepo.findOne({ where: { horse_id: horseId } });

    if (pedigree) {
      Object.assign(pedigree, this.mapDto(dto));
      pedigree = await this.pedigreeRepo.save(pedigree);
    } else {
      pedigree = await this.pedigreeRepo.save(
        this.pedigreeRepo.create({ horse_id: horseId, ...this.mapDto(dto) }),
      );
    }

    await this.horseRepo.update(horseId, { pedigree_status: 'pending' });
    return this.pedigreeRepo.findOne({
      where: { id: pedigree.id },
      relations: ['sire', 'dam', 'validations', 'documents'],
    }) as Promise<Pedigree>;
  }

  async triggerValidation(horseId: string, user: User): Promise<{ status: string; validations: PedigreeValidation[] }> {
    const horse = await this.assertHorseAccess(horseId, user);
    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException('Solo el propietario o un admin puede validar el pedigrí');
    }

    const pedigree = await this.pedigreeRepo.findOne({
      where: { horse_id: horseId },
      relations: ['sire', 'dam'],
    });
    if (!pedigree) throw new NotFoundException('El caballo no tiene pedigrí registrado aún');

    const { validations, scrapedParents } = await this.scrapingService.validate(pedigree);
    const overallStatus = this.scrapingService.overallStatus(validations);
    await this.horseRepo.update(horseId, { pedigree_status: overallStatus });

    // Si se encontraron los padres en alguna fuente, buscar automáticamente los abuelos
    if (scrapedParents) {
      const sireName  = scrapedParents.sireName  ?? pedigree.sire_name  ?? pedigree.sire?.name  ?? null;
      const damName   = scrapedParents.damName   ?? pedigree.dam_name   ?? pedigree.dam?.name   ?? null;
      const breedName = (horse as unknown as { breed?: { name: string } }).breed?.name ?? '';

      const grandparents = await this.scrapingService.scrapeGrandparents(sireName, damName, breedName);

      const updates: Partial<Pedigree> = {};
      if (grandparents.paternalGrandsire && !pedigree.paternal_grandsire_name) updates.paternal_grandsire_name = grandparents.paternalGrandsire;
      if (grandparents.paternalGranddam  && !pedigree.paternal_granddam_name)  updates.paternal_granddam_name  = grandparents.paternalGranddam;
      if (grandparents.maternalGrandsire && !pedigree.maternal_grandsire_name) updates.maternal_grandsire_name = grandparents.maternalGrandsire;
      if (grandparents.maternalGranddam  && !pedigree.maternal_granddam_name)  updates.maternal_granddam_name  = grandparents.maternalGranddam;

      if (Object.keys(updates).length) {
        await this.pedigreeRepo.update(pedigree.id, updates as any);
      }
    }

    return { status: overallStatus, validations };
  }

  async getValidations(horseId: string, user: User): Promise<PedigreeValidation[]> {
    await this.assertHorseAccess(horseId, user);
    const pedigree = await this.pedigreeRepo.findOne({ where: { horse_id: horseId } });
    if (!pedigree) return [];
    return this.validationRepo.find({
      where: { pedigree_id: pedigree.id },
      order: { created_at: 'DESC' },
    });
  }

  async addDocument(horseId: string, dto: UploadDocumentDto, user: User): Promise<PedigreeDocument> {
    const horse = await this.assertHorseAccess(horseId, user);
    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException('Solo el propietario o un admin puede subir documentos');
    }

    let pedigree = await this.pedigreeRepo.findOne({ where: { horse_id: horseId } });
    if (!pedigree) {
      pedigree = await this.pedigreeRepo.save(this.pedigreeRepo.create({ horse_id: horseId }));
    }

    return this.documentRepo.save(
      this.documentRepo.create({
        pedigree_id: pedigree.id,
        type: dto.type,
        file_url: dto.file_url,
        file_name: dto.file_name,
        uploaded_by: user.id,
      }),
    );
  }

  async getTree(horseId: string, depth: number, user: User): Promise<Record<string, unknown>> {
    await this.assertHorseAccess(horseId, user);
    const horse = await this.horseRepo.findOne({ where: { id: horseId }, relations: ['breed', 'activity'] });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    const pedigree = await this.pedigreeRepo.findOne({
      where: { horse_id: horseId },
      relations: ['sire', 'dam'],
    });

    return this.buildTree(horse, pedigree, depth);
  }

  private async buildTree(horse: Horse, pedigree: Pedigree | null, depth: number): Promise<Record<string, unknown>> {
    const node: Record<string, unknown> = {
      id: horse.id,
      name: horse.name,
      pedigree_status: horse.pedigree_status,
      registration_number: horse.registration_number,
      in_system: true,
    };

    if (depth <= 0 || !pedigree) return node;

    if (pedigree.sire_id && pedigree.sire) {
      const sirePedigree = await this.pedigreeRepo.findOne({ where: { horse_id: pedigree.sire_id }, relations: ['sire', 'dam'] });
      node.sire = await this.buildTree(pedigree.sire, sirePedigree, depth - 1);
    } else if (pedigree.sire_name) {
      node.sire = { name: pedigree.sire_name, in_system: false, registration_number: pedigree.sire_registration_number };
      if (depth > 1) {
        node.sire = { ...node.sire as object, sire: pedigree.paternal_grandsire_name ? { name: pedigree.paternal_grandsire_name, in_system: false } : null, dam: pedigree.paternal_granddam_name ? { name: pedigree.paternal_granddam_name, in_system: false } : null };
      }
    }

    if (pedigree.dam_id && pedigree.dam) {
      const damPedigree = await this.pedigreeRepo.findOne({ where: { horse_id: pedigree.dam_id }, relations: ['sire', 'dam'] });
      node.dam = await this.buildTree(pedigree.dam, damPedigree, depth - 1);
    } else if (pedigree.dam_name) {
      node.dam = { name: pedigree.dam_name, in_system: false, registration_number: pedigree.dam_registration_number };
      if (depth > 1) {
        node.dam = { ...node.dam as object, sire: pedigree.maternal_grandsire_name ? { name: pedigree.maternal_grandsire_name, in_system: false } : null, dam: pedigree.maternal_granddam_name ? { name: pedigree.maternal_granddam_name, in_system: false } : null };
      }
    }

    return node;
  }

  async search(query: string, user: User): Promise<Pick<Horse, 'id' | 'name' | 'registration_number'>[]> {
    if (!query || query.length < 2) return [];
    const horses = await this.horseRepo.find({
      where: [
        { name: Like(`%${query}%`), ...(user.role === 'admin' ? {} : { owner_id: user.id }) },
      ],
      select: ['id', 'name', 'registration_number'],
      take: 10,
    });
    return horses;
  }

  async adminResolve(horseId: string, dto: AdminResolveDto, user: User): Promise<Pedigree> {
    if (user.role !== 'admin') throw new ForbiddenException('Solo admin puede resolver disputas');
    const pedigree = await this.pedigreeRepo.findOne({ where: { horse_id: horseId } });
    if (!pedigree) throw new NotFoundException('Pedigrí no encontrado');

    const status = dto.resolution === 'validated' ? ValidationStatus.VALIDATED : ValidationStatus.DISPUTED;
    await this.validationRepo.save(
      this.validationRepo.create({
        pedigree_id: pedigree.id,
        source: ValidationSource.MANUAL_ADMIN,
        status,
        validated_fields: {},
        validated_by: user.id,
        validated_at: new Date(),
        notes: dto.notes ?? null,
      }),
    );

    const horseStatus = dto.resolution === 'validated' ? 'verified' : 'disputed';
    await this.horseRepo.update(horseId, { pedigree_status: horseStatus });
    return this.pedigreeRepo.findOne({ where: { id: pedigree.id }, relations: ['validations', 'documents'] }) as Promise<Pedigree>;
  }

  async getAdminStats(): Promise<Record<string, number>> {
    const total = await this.horseRepo.count({ where: { deleted_at: IsNull() } });
    const verified = await this.horseRepo.count({ where: { pedigree_status: 'verified', deleted_at: IsNull() } });
    const pending = await this.horseRepo.count({ where: { pedigree_status: 'pending', deleted_at: IsNull() } });
    const disputed = await this.horseRepo.count({ where: { pedigree_status: 'disputed', deleted_at: IsNull() } });
    return { total, verified, pending, disputed };
  }

  async getDisputedPedigrees(): Promise<Pedigree[]> {
    const horses = await this.horseRepo.find({ where: { pedigree_status: 'disputed', deleted_at: IsNull() }, select: ['id'] });
    const ids = horses.map((h) => h.id);
    if (!ids.length) return [];
    return this.pedigreeRepo.find({
      where: ids.map((id) => ({ horse_id: id })),
      relations: ['horse', 'validations'],
      order: { updated_at: 'DESC' },
    });
  }

  private mapDto(dto: CreatePedigreeDto) {
    return {
      sire_id: dto.sire_id ?? null,
      dam_id: dto.dam_id ?? null,
      sire_name: dto.sire_name ?? null,
      dam_name: dto.dam_name ?? null,
      sire_registration_number: dto.sire_registration_number ?? null,
      dam_registration_number: dto.dam_registration_number ?? null,
      paternal_grandsire_name: dto.paternal_grandsire_name ?? null,
      paternal_granddam_name: dto.paternal_granddam_name ?? null,
      maternal_grandsire_name: dto.maternal_grandsire_name ?? null,
      maternal_granddam_name: dto.maternal_granddam_name ?? null,
    };
  }

  private async assertHorseAccess(horseId: string, user: User): Promise<Horse> {
    const horse = await this.horseRepo.findOne({ where: { id: horseId, deleted_at: IsNull() } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    if (user.role === 'admin') return horse;
    if (horse.owner_id === user.id) return horse;
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) return horse;
    const entry = await this.horseUserRepo.findOne({ where: { horse_id: horseId, user_id: user.id } });
    if (entry) return horse;
    if (horse.organization_id) {
      const rows: { role_in_org: string }[] = await this.horseRepo.query(
        `SELECT role_in_org FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
        [horse.organization_id, user.id],
      );
      if (rows.length) return horse;
    }
    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
