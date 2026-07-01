import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { Pedigree, PedigreeValidation, ValidationSource, ValidationStatus } from './entities/pedigree.entity';
import { SraScraper } from './scrapers/sra.scraper';
import { fuzzyMatch, ScrapedPedigree } from './scrapers/base-scraper';
import { HorseRecordsScrapingService } from '../horse-records/horse-records-scraping.service';

const SCRAPER_SOURCE_MAP: Record<string, ValidationSource> = {
  studbook_ar: ValidationSource.STUDBOOK_AR,
  sra: ValidationSource.SRA,
  pedigreequery: ValidationSource.PEDIGREEQUERY,
};

// Adapta el resultado del motor unificado (horse-records) al shape ScrapedPedigree
function adaptRecord(r: {
  sire_name: string | null;
  dam_name: string | null;
  registration_number: string | null;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}): ScrapedPedigree {
  return {
    sireName: r.sire_name ?? undefined,
    damName: r.dam_name ?? undefined,
    registrationNumber: r.registration_number ?? undefined,
    confidence: r.confidence,
    source: r.source,
  };
}

@Injectable()
export class PedigreeScrapingService {
  // SRA (Criollo/Cuarto de Milla/Polo) no existe en el motor horse-records → se conserva.
  private readonly sra = new SraScraper();

  constructor(
    @InjectRepository(PedigreeValidation)
    private readonly validationRepo: Repository<PedigreeValidation>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    private readonly horseRecords: HorseRecordsScrapingService,
  ) {}

  async validate(pedigree: Pedigree): Promise<{ validations: PedigreeValidation[]; scrapedParents: ScrapedPedigree | null }> {
    const horse = await this.horseRepo.findOne({
      where: { id: pedigree.horse_id },
      relations: ['breed'],
    });

    const query = horse?.name ?? '';
    if (!query) return { validations: [], scrapedParents: null };

    // Cada "intento" produce una validación (una fila) por fuente aplicable.
    const attempts = await this.collectScrapes(horse?.breed?.name ?? '', query);

    const validations: PedigreeValidation[] = [];
    let bestScrape: ScrapedPedigree | null = null;

    for (const { source, scraped } of attempts) {
      if (!scraped) {
        validations.push(await this.saveValidation(pedigree.id, source, ValidationStatus.FAILED, {}, null));
        continue;
      }

      const { status, validatedFields, discrepancies } = this.compareResults(pedigree, scraped);
      validations.push(await this.saveValidation(pedigree.id, source, status, validatedFields, discrepancies));

      // Guardar el mejor resultado para usarlo en la cascada de abuelos
      if (status === ValidationStatus.VALIDATED || status === ValidationStatus.PARTIAL) {
        if (!bestScrape) bestScrape = scraped;
      }
    }

    return { validations, scrapedParents: bestScrape };
  }

  // Reúne los resultados de las fuentes aplicables a la raza como
  // { source, scraped }. Un scraped=null representa un intento fallido
  // (se registra como validación FAILED, igual que antes).
  private async collectScrapes(
    breedName: string,
    query: string,
  ): Promise<Array<{ source: ValidationSource; scraped: ScrapedPedigree | null }>> {
    const attempts: Array<{ source: ValidationSource; scraped: ScrapedPedigree | null }> = [];

    // SRA: solo Criollo/Cuarto de Milla/Polo (scraper propio, no existe en horse-records).
    if (this.usesSra(breedName)) {
      const sra = await this.sra.scrape(query).catch(() => null);
      attempts.push({ source: ValidationSource.SRA, scraped: sra });
    }

    // Motor unificado horse-records (studbook + pedigreequery + wikidata).
    const record = await this.horseRecords.scrapeParents(query).catch(() => null);
    if (record) {
      attempts.push({
        source: SCRAPER_SOURCE_MAP[record.source] ?? ValidationSource.PEDIGREEQUERY,
        scraped: adaptRecord(record),
      });
    } else {
      attempts.push({ source: ValidationSource.STUDBOOK_AR, scraped: null });
    }

    return attempts;
  }

  async scrapeGrandparents(
    sireName: string | null,
    damName: string | null,
    breedName: string,
  ): Promise<{ paternalGrandsire: string | null; paternalGranddam: string | null; maternalGrandsire: string | null; maternalGranddam: string | null }> {
    void breedName; // el motor unificado cubre todas las razas; se mantiene la firma
    const [sireData, damData] = await Promise.all([
      sireName ? this.horseRecords.scrapeParents(sireName).catch(() => null) : Promise.resolve(null),
      damName  ? this.horseRecords.scrapeParents(damName).catch(() => null)  : Promise.resolve(null),
    ]);

    return {
      paternalGrandsire: sireData?.sire_name ?? null,
      paternalGranddam:  sireData?.dam_name  ?? null,
      maternalGrandsire: damData?.sire_name  ?? null,
      maternalGranddam:  damData?.dam_name   ?? null,
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

  private usesSra(breedName: string): boolean {
    const lower = breedName.toLowerCase();
    return lower.includes('criollo') || lower.includes('cuarto') || lower.includes('polo');
  }

  overallStatus(validations: PedigreeValidation[]): Horse['pedigree_status'] {
    if (!validations.length) return 'pending';
    const statuses = validations.map((v) => v.status);
    if (statuses.includes(ValidationStatus.VALIDATED)) return 'verified';
    if (statuses.includes(ValidationStatus.PARTIAL)) return 'partial';
    if (statuses.some((s) => s === ValidationStatus.DISPUTED)) return 'disputed';
    if (statuses.every((s) => s === ValidationStatus.FAILED)) return 'unverified';
    return 'pending';
  }
}
