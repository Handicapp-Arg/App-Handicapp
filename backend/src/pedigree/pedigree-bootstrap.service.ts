import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { Pedigree, PedigreeValidation } from './entities/pedigree.entity';
import { PedigreeScrapingService } from './pedigree-scraping.service';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 15_000; // 15s entre batches para no sobrecargar fuentes externas

@Injectable()
export class PedigreeBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PedigreeBootstrapService.name);

  constructor(
    @InjectRepository(Horse) private readonly horseRepo: Repository<Horse>,
    @InjectRepository(Pedigree) private readonly pedigreeRepo: Repository<Pedigree>,
    @InjectRepository(PedigreeValidation) private readonly validationRepo: Repository<PedigreeValidation>,
    private readonly scrapingService: PedigreeScrapingService,
  ) {}

  onApplicationBootstrap() {
    // No bloqueamos el arranque — corremos en background
    this.runBulkScraping().catch((err) =>
      this.logger.error('Bulk scraping failed', err?.message),
    );
  }

  private async runBulkScraping(): Promise<void> {
    // Caballos que tienen pedigrí cargado pero sin ninguna validación aún
    const unvalidated = await this.pedigreeRepo
      .createQueryBuilder('p')
      .leftJoin('p.validations', 'v')
      .where('v.id IS NULL')
      .select(['p.id', 'p.horse_id', 'p.sire_name', 'p.dam_name'])
      .getMany();

    // Caballos con pedigree_status = 'unverified' y sin pedigrí en tabla — tienen nombre/nro de registro
    const unverifiedHorses = await this.horseRepo
      .createQueryBuilder('h')
      .where('h.pedigree_status = :s', { s: 'unverified' })
      .andWhere('h.registration_number IS NOT NULL')
      .leftJoin('pedigrees', 'p', 'p.horse_id = h.id')
      .andWhere('p.id IS NULL')
      .select(['h.id', 'h.name', 'h.registration_number', 'h.registration_source'])
      .getMany();

    const total = unvalidated.length + unverifiedHorses.length;
    if (total === 0) {
      this.logger.log('Bulk scraping: all horses already validated, nothing to do');
      return;
    }

    this.logger.log(`Bulk scraping: ${unvalidated.length} pedigrees pending validation, ${unverifiedHorses.length} horses without pedigree`);

    // Procesar pedigrís sin validación en batches
    for (let i = 0; i < unvalidated.length; i += BATCH_SIZE) {
      const batch = unvalidated.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map((p) => this.validatePedigree(p)));
      this.logger.log(`Bulk scraping progress: ${Math.min(i + BATCH_SIZE, unvalidated.length)}/${unvalidated.length} pedigrees`);
      if (i + BATCH_SIZE < unvalidated.length) await this.delay(BATCH_DELAY_MS);
    }
  }

  private async validatePedigree(pedigree: Pedigree): Promise<void> {
    try {
      const full = await this.pedigreeRepo.findOne({
        where: { id: pedigree.id },
        relations: ['sire', 'dam'],
      });
      if (!full) return;

      const { validations } = await this.scrapingService.validate(full);

      const horse = await this.horseRepo.findOne({ where: { id: full.horse_id } });
      if (horse) {
        horse.pedigree_status = this.scrapingService.overallStatus(validations);
        await this.horseRepo.save(horse);
      }
    } catch (err) {
      this.logger.warn(`Bulk scraping: failed for pedigree ${pedigree.id}: ${err?.message}`);
    }
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
