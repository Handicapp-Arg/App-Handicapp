import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { HorseRecord } from './horse-record.entity';
import { fuzzyMatchNames, ScrapedHorseRecord } from './scrapers/base-record-scraper';
import { WikidataScraper } from './scrapers/wikidata.scraper';
import { PuppeteerScraperService } from './scrapers/puppeteer-scraper.service';

const MIN_BIRTH_YEAR = 1990;
const BATCH_SIZE = 5;

@Injectable()
export class HorseRecordsScrapingService {
  private readonly logger = new Logger(HorseRecordsScrapingService.name);
  private readonly wikidata = new WikidataScraper();

  constructor(
    @InjectRepository(HorseRecord)
    private readonly recordRepo: Repository<HorseRecord>,
    private readonly puppeteer: PuppeteerScraperService,
  ) {}

  // ─── Cron cada 3 minutos: procesa la cola de scraping ───────────────────
  @Cron('*/3 * * * *')
  async processPendingQueue(): Promise<void> {
    const pending = await this.recordRepo.find({
      where: [
        { scrape_status: 'pending' },
        { scrape_status: 'failed', scrape_attempts: LessThan(3) },
      ],
      order: { created_at: 'ASC' },
      take: BATCH_SIZE,
    });

    if (!pending.length) return;

    this.logger.log(`Scraping queue: processing ${pending.length} records`);

    for (const record of pending) {
      await this.scrapeOne(record);
    }
  }

  // ─── Scraping de un horse_record individual ──────────────────────────────
  async scrapeOne(record: HorseRecord): Promise<HorseRecord> {
    // Marcar como "en proceso" para evitar doble procesamiento
    await this.recordRepo.update(record.id, { scrape_status: 'scraping' });

    try {
      const scraped = await this.fetchFromSources(record.name);

      if (!scraped) {
        await this.recordRepo.update(record.id, {
          scrape_status: record.scrape_attempts >= 2 ? 'failed' : 'pending',
          scrape_attempts: record.scrape_attempts + 1,
          last_scraped_at: new Date(),
        });
        return record;
      }

      // Actualizar el registro con los datos scraped
      const updates: Partial<HorseRecord> = {
        scrape_status: 'done',
        last_scraped_at: new Date(),
        data_confidence: scraped.confidence,
        scrape_attempts: record.scrape_attempts + 1,
      };

      if (scraped.birth_year && !record.birth_year) updates.birth_year = scraped.birth_year;
      if (scraped.birth_date && !record.birth_date) updates.birth_date = scraped.birth_date;
      if (scraped.sex && !record.sex) updates.sex = scraped.sex;
      if (scraped.color && !record.color) updates.color = scraped.color;
      if (scraped.breed && !record.breed) updates.breed = scraped.breed;
      if (scraped.country_code && !record.country_code) updates.country_code = scraped.country_code;
      if (scraped.registration_number && !record.registration_number) updates.registration_number = scraped.registration_number;
      if (scraped.source_url && !record.source_url) updates.source_url = scraped.source_url;

      // Procesar padre (sire)
      if (scraped.sire_name && !record.sire_id) {
        const sireRecord = await this.upsertRelative(scraped.sire_name, scraped.birth_year);
        if (sireRecord) {
          updates.sire_id = sireRecord.id;
          updates.sire_name = sireRecord.name;
        } else {
          updates.sire_name = scraped.sire_name;
        }
      }

      // Procesar madre (dam)
      if (scraped.dam_name && !record.dam_id) {
        const damRecord = await this.upsertRelative(scraped.dam_name, scraped.birth_year);
        if (damRecord) {
          updates.dam_id = damRecord.id;
          updates.dam_name = damRecord.name;
        } else {
          updates.dam_name = scraped.dam_name;
        }
      }

      await this.recordRepo.update(record.id, updates);

      this.logger.debug(`Scraped: ${record.name} (sire: ${scraped.sire_name ?? '?'}, dam: ${scraped.dam_name ?? '?'})`);
      return { ...record, ...updates } as HorseRecord;
    } catch (err) {
      this.logger.warn(`Failed to scrape ${record.name}: ${(err as Error).message}`);
      await this.recordRepo.update(record.id, {
        scrape_status: record.scrape_attempts >= 2 ? 'failed' : 'pending',
        scrape_attempts: record.scrape_attempts + 1,
        last_scraped_at: new Date(),
      });
      return record;
    }
  }

  // ─── Crear o encontrar el registro del padre/madre y encolarlo ───────────
  async upsertRelative(name: string, childBirthYear: number | null | undefined): Promise<HorseRecord | null> {
    if (!name?.trim()) return null;

    // Un padre nació típicamente 3-8 años antes que el hijo
    const estimatedYear = childBirthYear ? childBirthYear - 5 : null;

    // Filtrar por año: solo encolamos si el relativo es de 1990 en adelante
    // (o si no sabemos el año, lo encolamos igual para que el scraper lo determine)
    if (estimatedYear && estimatedYear < MIN_BIRTH_YEAR) {
      // Creamos el registro pero marcado como 'skipped' — existirá en el árbol
      // con nombre pero sin profundizar más
      return this.findOrCreateStub(name, estimatedYear);
    }

    return this.findOrCreatePending(name);
  }

  // ─── Busca por nombre fuzzy; si no existe, crea pending ─────────────────
  async findOrCreatePending(name: string): Promise<HorseRecord> {
    const existing = await this.findByNameFuzzy(name);
    if (existing) return existing;

    return this.recordRepo.save(
      this.recordRepo.create({
        name: name.trim(),
        scrape_status: 'pending',
        registration_source: 'allbreed',
      }),
    );
  }

  // ─── Crea stub para caballos fuera del rango (pre-1990) ─────────────────
  private async findOrCreateStub(name: string, estimatedYear: number): Promise<HorseRecord> {
    const existing = await this.findByNameFuzzy(name);
    if (existing) return existing;

    return this.recordRepo.save(
      this.recordRepo.create({
        name: name.trim(),
        birth_year: estimatedYear,
        scrape_status: 'skipped',
        registration_source: 'allbreed',
        data_confidence: 'low',
      }),
    );
  }

  // ─── Búsqueda fuzzy por nombre en la DB ─────────────────────────────────
  async findByNameFuzzy(name: string): Promise<HorseRecord | null> {
    const normalized = name.trim().toUpperCase();

    // Búsqueda exacta primero (case-insensitive)
    const exact = await this.recordRepo
      .createQueryBuilder('r')
      .where('UPPER(r.name) = :name', { name: normalized })
      .getOne();
    if (exact) return exact;

    // Búsqueda por similitud con ILIKE en variantes
    const candidates = await this.recordRepo
      .createQueryBuilder('r')
      .where('r.name ILIKE :name', { name: `%${name.trim().split(' ')[0]}%` })
      .limit(20)
      .getMany();

    return candidates.find((c) => fuzzyMatchNames(c.name, name)) ?? null;
  }

  // ─── Llama a múltiples fuentes y fusiona resultados ─────────────────────
  private async fetchFromSources(name: string): Promise<ScrapedHorseRecord | null> {
    // 1. Wikidata — sin bot-protection, rápido
    const wiki = await this.wikidata.scrapeByName(name).catch(() => null);

    // 2. Allbreed via Puppeteer (bypasa Cloudflare) — solo si Wikidata no tiene pedigree
    let puppeteerResult: ScrapedHorseRecord | null = null;
    if (!wiki?.sire_name) {
      puppeteerResult = await this.puppeteer.scrapeAllBreed(name).catch(() => null);
    }

    if (!wiki && !puppeteerResult) return null;

    // Fusionar: empezar con el de mayor confianza
    let best = wiki ?? puppeteerResult!;
    const other = best === wiki ? puppeteerResult : wiki;

    if (other) {
      if (!best.sire_name && other.sire_name) best = { ...best, sire_name: other.sire_name };
      if (!best.dam_name  && other.dam_name)  best = { ...best, dam_name:  other.dam_name  };
      if (!best.birth_year && other.birth_year) best = { ...best, birth_year: other.birth_year };
      if (!best.sex && other.sex) best = { ...best, sex: other.sex };
      if (!best.color && other.color) best = { ...best, color: other.color };
    }

    return best;
  }

  // ─── Bulk import desde Wikidata (llamado desde bootstrap) ─────────────────
  async bulkImportFromWikidata(minYear = 1990, maxYear = 2020): Promise<number> {
    let imported = 0;
    let offset = 0;
    const limit = 200;

    this.logger.log(`Bulk importing horses ${minYear}-${maxYear} from Wikidata...`);

    while (true) {
      const batch = await this.wikidata.bulkFetch(minYear, maxYear, offset, limit).catch(() => []);
      if (!batch.length) break;

      for (const scraped of batch) {
        if (!scraped.name?.trim()) continue;
        try {
          const existing = await this.findByNameFuzzy(scraped.name);
          if (existing) {
            // Update missing fields only
            const upd: Partial<HorseRecord> = {};
            if (!existing.sire_name && scraped.sire_name) upd.sire_name = scraped.sire_name;
            if (!existing.dam_name  && scraped.dam_name)  upd.dam_name  = scraped.dam_name;
            if (!existing.birth_year && scraped.birth_year) upd.birth_year = scraped.birth_year;
            if (!existing.sex && scraped.sex) upd.sex = scraped.sex;
            if (!existing.color && scraped.color) upd.color = scraped.color;
            if (Object.keys(upd).length) await this.recordRepo.update(existing.id, upd);
            continue;
          }

          const record = this.recordRepo.create({
            name: scraped.name.trim(),
            birth_year: scraped.birth_year ?? null,
            sex: scraped.sex ?? null,
            color: scraped.color ?? null,
            breed: scraped.breed ?? null,
            country_code: scraped.country_code ?? null,
            sire_name: scraped.sire_name ?? null,
            dam_name: scraped.dam_name ?? null,
            source_url: scraped.source_url ?? null,
            scrape_status: scraped.sire_name ? 'done' : 'pending',
            data_confidence: scraped.confidence,
            registration_source: 'allbreed',
            last_scraped_at: new Date(),
          });
          await this.recordRepo.save(record);
          imported++;
        } catch { /* skip dup */ }
      }

      offset += limit;
      if (batch.length < limit) break;
      await new Promise(r => setTimeout(r, 1500)); // rate limit
    }

    this.logger.log(`Wikidata bulk import done: ${imported} new records`);
    return imported;
  }

  // ─── Enqueue manual para on-demand (cuando usuario busca un caballo) ─────
  async enqueueSearch(name: string): Promise<HorseRecord> {
    const existing = await this.findByNameFuzzy(name);
    if (existing) {
      // Si ya existe pero está en estado 'failed', reintentamos
      if (existing.scrape_status === 'failed') {
        await this.recordRepo.update(existing.id, { scrape_status: 'pending', scrape_attempts: 0 });
      }
      return existing;
    }
    const record = await this.findOrCreatePending(name);
    // Procesar inmediatamente (no esperar al cron) para respuesta rápida al usuario
    setTimeout(() => this.scrapeOne(record).catch(() => {}), 500);
    return record;
  }

  // ─── Reintentar todos los fallidos ───────────────────────────────────────
  async retryAllFailed(): Promise<{ reset: number }> {
    const result = await this.recordRepo
      .createQueryBuilder()
      .update()
      .set({ scrape_status: 'pending', scrape_attempts: 0 })
      .where('scrape_status = :s', { s: 'failed' })
      .execute();
    this.logger.log(`Reset ${result.affected} failed records to pending`);
    return { reset: result.affected ?? 0 };
  }

  // ─── Stats de la cola ────────────────────────────────────────────────────
  async getQueueStats() {
    const [pending, done, failed, total] = await Promise.all([
      this.recordRepo.count({ where: { scrape_status: 'pending' } }),
      this.recordRepo.count({ where: { scrape_status: 'done' } }),
      this.recordRepo.count({ where: { scrape_status: 'failed' } }),
      this.recordRepo.count(),
    ]);
    return { pending, done, failed, total };
  }
}
