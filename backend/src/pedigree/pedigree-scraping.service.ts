import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { Pedigree, PedigreeValidation, ValidationSource, ValidationStatus } from './entities/pedigree.entity';
import { StudbookArScraper } from './scrapers/studbook-ar.scraper';
import { SraScraper } from './scrapers/sra.scraper';
import { PedigreeQueryScraper } from './scrapers/pedigreequery.scraper';
import { fuzzyMatch, ScrapedPedigree } from './scrapers/base-scraper';

const SCRAPER_SOURCE_MAP: Record<string, ValidationSource> = {
  studbook_ar: ValidationSource.STUDBOOK_AR,
  sra: ValidationSource.SRA,
  pedigreequery: ValidationSource.PEDIGREEQUERY,
};

@Injectable()
export class PedigreeScrapingService {
  private readonly studbook = new StudbookArScraper();
  private readonly sra = new SraScraper();
  private readonly pedigreeQuery = new PedigreeQueryScraper();

  constructor(
    @InjectRepository(PedigreeValidation)
    private readonly validationRepo: Repository<PedigreeValidation>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
  ) {}

  async validate(pedigree: Pedigree): Promise<{ validations: PedigreeValidation[]; scrapedParents: ScrapedPedigree | null }> {
    const horse = await this.horseRepo.findOne({
      where: { id: pedigree.horse_id },
      relations: ['breed'],
    });

    const scrapers = this.selectScrapers(horse?.breed?.name ?? '');
    const query = horse?.name ?? '';
    if (!query) return { validations: [], scrapedParents: null };

    const results = await Promise.allSettled(
      scrapers.map((s) => s.scrape(query)),
    );

    const validations: PedigreeValidation[] = [];
    let bestScrape: ScrapedPedigree | null = null;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const scraperName = scrapers[i]['sourceName'] as string;
      const source = SCRAPER_SOURCE_MAP[scraperName] ?? ValidationSource.PEDIGREEQUERY;

      if (result.status === 'rejected' || !result.value) {
        validations.push(await this.saveValidation(pedigree.id, source, ValidationStatus.FAILED, {}, null));
        continue;
      }

      const scraped = result.value;
      const { status, validatedFields, discrepancies } = this.compareResults(pedigree, scraped);
      validations.push(await this.saveValidation(pedigree.id, source, status, validatedFields, discrepancies));

      // Guardar el mejor resultado para usarlo en la cascada de abuelos
      if (status === ValidationStatus.VALIDATED || status === ValidationStatus.PARTIAL) {
        if (!bestScrape) bestScrape = scraped;
      }
    }

    return { validations, scrapedParents: bestScrape };
  }

  async scrapeGrandparents(
    sireName: string | null,
    damName: string | null,
    breedName: string,
  ): Promise<{ paternalGrandsire: string | null; paternalGranddam: string | null; maternalGrandsire: string | null; maternalGranddam: string | null }> {
    const scrapers = this.selectScrapers(breedName);
    const primary = scrapers[0]; // el más relevante para esa raza

    const [sireResult, damResult] = await Promise.allSettled([
      sireName ? primary.scrape(sireName) : Promise.resolve(null),
      damName  ? primary.scrape(damName)  : Promise.resolve(null),
    ]);

    const sireData = sireResult.status === 'fulfilled' ? sireResult.value : null;
    const damData  = damResult.status  === 'fulfilled' ? damResult.value  : null;

    return {
      paternalGrandsire: sireData?.sireName ?? null,
      paternalGranddam:  sireData?.damName  ?? null,
      maternalGrandsire: damData?.sireName  ?? null,
      maternalGranddam:  damData?.damName   ?? null,
    };
  }

  private compareResults(
    pedigree: Pedigree,
    scraped: ScrapedPedigree,
  ): { status: ValidationStatus; validatedFields: Record<string, boolean>; discrepancies: Record<string, unknown> | null } {
    const validatedFields: Record<string, boolean> = {};
    const discrepancies: Record<string, unknown> = {};

    const sireExpected = pedigree.sire_name ?? pedigree.sire?.name ?? null;
    const damExpected = pedigree.dam_name ?? pedigree.dam?.name ?? null;

    if (sireExpected && scraped.sireName) {
      validatedFields.sire_name = fuzzyMatch(sireExpected, scraped.sireName);
      if (!validatedFields.sire_name) discrepancies.sire_name = { expected: sireExpected, found: scraped.sireName };
    }
    if (damExpected && scraped.damName) {
      validatedFields.dam_name = fuzzyMatch(damExpected, scraped.damName);
      if (!validatedFields.dam_name) discrepancies.dam_name = { expected: damExpected, found: scraped.damName };
    }

    const matched = Object.values(validatedFields).filter(Boolean).length;
    const total = Object.keys(validatedFields).length;

    let status: ValidationStatus;
    if (total === 0) status = ValidationStatus.FAILED;
    else if (matched === total) status = ValidationStatus.VALIDATED;
    else if (matched > 0) status = ValidationStatus.PARTIAL;
    else status = ValidationStatus.FAILED;

    return { status, validatedFields, discrepancies: Object.keys(discrepancies).length ? discrepancies : null };
  }

  private async saveValidation(
    pedigreeId: string,
    source: ValidationSource,
    status: ValidationStatus,
    validatedFields: Record<string, boolean>,
    discrepancies: Record<string, unknown> | null,
  ): Promise<PedigreeValidation> {
    return this.validationRepo.save(
      this.validationRepo.create({ pedigree_id: pedigreeId, source, status, validated_fields: validatedFields, discrepancies }),
    );
  }

  private selectScrapers(breedName: string) {
    const lower = breedName.toLowerCase();
    if (lower.includes('criollo') || lower.includes('cuarto') || lower.includes('polo')) {
      return [this.sra, this.pedigreeQuery];
    }
    // PSI, Árabe y resto → studbook + pedigreequery
    return [this.studbook, this.pedigreeQuery];
  }

  overallStatus(validations: PedigreeValidation[]): Horse['pedigree_status'] {
    if (!validations.length) return 'pending';
    const statuses = validations.map((v) => v.status);
    if (statuses.includes(ValidationStatus.VALIDATED)) return 'verified';
    if (statuses.includes(ValidationStatus.PARTIAL)) return 'partial';
    if (statuses.some((s) => s === ValidationStatus.DISPUTED)) return 'disputed';
    return 'pending';
  }
}
