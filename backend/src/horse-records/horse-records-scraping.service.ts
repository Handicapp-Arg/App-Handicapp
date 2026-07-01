import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { HorseRecord } from './horse-record.entity';
import { fuzzyMatchNames, ScrapedHorseRecord } from './scrapers/base-record-scraper';
import { WikidataScraper } from './scrapers/wikidata.scraper';
import { StudbookArScraper } from './scrapers/studbook-ar.scraper';
import { PedigreeQueryRecordScraper } from './scrapers/pedigreequery-record.scraper';
import { PuppeteerScraperService } from './scrapers/puppeteer-scraper.service';

const MIN_BIRTH_YEAR = 1900;
const BATCH_SIZE = 30;
const STUB_RESOLVE_BATCH = 30;
// Techo alto de seguridad; el corte real de cada corrida es por TIEMPO (ver
// resolveAllPendingStubs) para poder drenar hasta vaciar la cola de stubs.
const STUB_RESOLVE_MAX_ITERATIONS = 2000;

// ─── Progreso de un job de import ────────────────────────────────────────────
export interface ImportProgress {
  jobId: string;
  source: string;
  status: 'running' | 'done' | 'error';
  startedAt: Date;
  finishedAt?: Date;
  processed: number;
  imported: number;
  updated: number;
  errors: number;
  currentPage?: number;
  totalEstimate?: number;
  message?: string;
}

@Injectable()
export class HorseRecordsScrapingService {
  private readonly logger = new Logger(HorseRecordsScrapingService.name);
  private drainingQueue = false; // evita solapar corridas del cron de la cola
  private readonly wikidata   = new WikidataScraper();
  private readonly studbookAr = new StudbookArScraper();
  private readonly pedigreeQuery = new PedigreeQueryRecordScraper();

  // Jobs activos/recientes (se limpia al reiniciar el proceso)
  private readonly jobs = new Map<string, ImportProgress>();

  constructor(
    @InjectRepository(HorseRecord)
    private readonly recordRepo: Repository<HorseRecord>,
    private readonly puppeteer: PuppeteerScraperService,
  ) {}

  // ─── Progreso de jobs ─────────────────────────────────────────────────────
  getJobProgress(jobId: string): ImportProgress | null {
    return this.jobs.get(jobId) ?? null;
  }

  getAllJobs(): ImportProgress[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  // ─── IMPORTACIÓN COMPLETA — todos los libros + pedigrí profundo ──────────
  // Corre una sola vez (o cuando el admin lo dispare).
  // Secuencia: Studbook AR → Wikidata (1900–hoy) → resolver stubs en cascada.
  async fullImportAll(): Promise<string> {
    const running = Array.from(this.jobs.values()).find(
      (j) => j.source === 'full_import' && j.status === 'running',
    );
    if (running) return running.jobId;

    const jobId = `full_import_${Date.now()}`;
    const progress: ImportProgress = {
      jobId,
      source: 'full_import',
      status: 'running',
      startedAt: new Date(),
      processed: 0,
      imported: 0,
      updated: 0,
      errors: 0,
      currentPage: 0,
      message: 'Iniciando importación completa…',
    };
    this.jobs.set(jobId, progress);

    setImmediate(() => this.runFullImport(progress).catch((e) => {
      progress.status = 'error';
      progress.message = (e as Error).message;
      progress.finishedAt = new Date();
      this.logger.error('Full import failed', e);
    }));

    return jobId;
  }

  private async runFullImport(progress: ImportProgress): Promise<void> {
    this.logger.log('Full import — fase 1/3: Studbook AR (adaptive)');
    progress.message = 'Fase 1/3: Studbook AR…';
    await this.studbookAr.collectAll(
      async (item) => {
        await this.importListItem(item, progress);
        await this.delay(100);
      },
      (term, found, total) => {
        progress.message = `Fase 1/3: explorando "${term}" — ${total} acumulados`;
      },
    );

    this.logger.log('Full import — fase 2/3: Wikidata 1900–hoy');
    progress.message = 'Fase 2/3: Wikidata…';
    await this.runWikidataImport(progress, MIN_BIRTH_YEAR, new Date().getFullYear());

    this.logger.log('Full import — fase 3/3: resolviendo stubs (pedigrí profundo)');
    progress.message = 'Fase 3/3: resolviendo pedigrí profundo…';
    await this.resolveAllPendingStubs(progress);

    progress.status = 'done';
    progress.finishedAt = new Date();
    progress.message = `Importación completa: ${progress.imported} nuevos, ${progress.updated} actualizados.`;
    this.logger.log(`Full import done: ${progress.imported} new, ${progress.updated} updated`);
  }

  // Resuelve stubs pendientes en cascada hasta que no queden más (o se alcance el límite de seguridad)
  private async resolveAllPendingStubs(progress: ImportProgress): Promise<void> {
    const startedAt = Date.now();
    const MAX_MS = 20 * 60 * 1000; // 20 min por corrida; el resto lo drena el cron continuo
    for (let i = 0; i < STUB_RESOLVE_MAX_ITERATIONS; i++) {
      if (Date.now() - startedAt > MAX_MS) {
        this.logger.warn('Stub resolution: corte por tiempo; quedan stubs pending para el cron');
        break;
      }
      const pending = await this.recordRepo.find({
        where: [
          { scrape_status: 'pending' },
          { scrape_status: 'failed', scrape_attempts: LessThan(3) },
        ],
        order: { created_at: 'ASC' },
        take: STUB_RESOLVE_BATCH,
      });

      if (!pending.length) break;

      progress.message = `Fase 3/3: stubs lote ${i + 1} (${pending.length} registros)…`;
      this.logger.log(`Stub resolution batch ${i + 1}: ${pending.length} records`);

      for (const record of pending) {
        await this.scrapeIndividual(record);
        await this.delay(800);
      }
    }
  }

  // ─── BULK IMPORT desde Studbook AR ───────────────────────────────────────
  // Crawlea el listado completo de studbook.org.ar y guarda todo en la BD.
  // Se puede llamar manualmente desde el panel admin.
  async bulkImportFromStudbookAR(): Promise<string> {
    // Un solo job a la vez
    const running = Array.from(this.jobs.values()).find(
      (j) => j.source === 'studbook_ar' && j.status === 'running',
    );
    if (running) return running.jobId;

    const jobId = `studbook_ar_${Date.now()}`;
    const progress: ImportProgress = {
      jobId,
      source: 'studbook_ar',
      status: 'running',
      startedAt: new Date(),
      processed: 0,
      imported: 0,
      updated: 0,
      errors: 0,
      currentPage: 0,
      message: 'Iniciando…',
    };
    this.jobs.set(jobId, progress);

    // Ejecutar en background
    setImmediate(() => this.runStudbookImport(progress).catch((e) => {
      progress.status = 'error';
      progress.message = (e as Error).message;
      progress.finishedAt = new Date();
      this.logger.error('StudbookAR import failed', e);
    }));

    return jobId;
  }

  private async runStudbookImport(progress: ImportProgress): Promise<void> {
    this.logger.log('Starting StudbookAR bulk import (adaptive)');

    await this.studbookAr.collectAll(
      async (item) => {
        await this.importListItem(item, progress);
        await this.delay(100);
      },
      (term, found, total) => {
        progress.message = `Explorando "${term}" — ${found} resultados — ${total} acumulados`;
        this.logger.debug(`Studbook adaptive: term="${term}" found=${found} total=${total}`);
      },
    );

    progress.status = 'done';
    progress.finishedAt = new Date();
    progress.message = `Importación completada. ${progress.imported} nuevos, ${progress.updated} actualizados.`;
    this.logger.log(`StudbookAR import done: ${progress.imported} new, ${progress.updated} updated`);
  }

  // Importa un item de listado — usa datos pre-fetched si están disponibles,
  // cae a fetchProfile solo si no hay datos del autocomplete.
  private async importListItem(
    item: { profileUrl: string; name: string; prefetched?: any },
    progress: ImportProgress,
  ): Promise<void> {
    progress.processed++;
    if (item.prefetched) {
      const scraped = {
        name: item.name,
        country_code: 'ARG' as const,
        source_url: item.profileUrl,
        confidence: (item.prefetched.sire_name && item.prefetched.dam_name) ? 'high' as const : 'medium' as const,
        ...item.prefetched,
      };
      return this.upsertScrapedRecord(scraped, 'studbook_ar', progress);
    }
    return this.importProfileUrl(item.profileUrl, item.name, progress);
  }

  private async importProfileUrl(
    profileUrl: string,
    fallbackName: string,
    progress: ImportProgress,
  ): Promise<void> {
    try {
      const scraped = await this.studbookAr.fetchProfile(profileUrl);
      if (!scraped?.name) return;
      await this.upsertScrapedRecord(scraped as any, 'studbook_ar', progress);
    } catch (err) {
      progress.errors++;
      this.logger.warn(`Error importing ${fallbackName}: ${(err as Error).message}`);
    }
  }

  private async upsertScrapedRecord(
    scraped: { name: string; birth_year?: number | null; birth_date?: string | null; sex?: any; color?: any; country_code?: string | null; sire_name?: string | null; dam_name?: string | null; registration_number?: string | null; source_url?: string | null; confidence?: any },
    source: import('./horse-record.entity').RecordSource,
    progress: ImportProgress,
  ): Promise<void> {
    try {
      // Usamos match exacto (case-insensitive) en el bulk import para evitar
      // falsos positivos con homónimos internacionales en Wikidata.
      const existing = await this.findByNameExact(scraped.name);

      if (existing) {
        // Actualizar solo campos faltantes
        const upd: Partial<HorseRecord> = {};
        if (!existing.sire_name  && scraped.sire_name)  upd.sire_name  = scraped.sire_name;
        if (!existing.dam_name   && scraped.dam_name)   upd.dam_name   = scraped.dam_name;
        if (!existing.birth_year && scraped.birth_year) upd.birth_year = scraped.birth_year;
        if (!existing.sex        && scraped.sex)        upd.sex        = scraped.sex;
        if (!existing.color      && scraped.color)      upd.color      = scraped.color;
        if (!existing.registration_number && scraped.registration_number)
          upd.registration_number = scraped.registration_number;
        if (!existing.source_url && scraped.source_url) upd.source_url = scraped.source_url;

        if (Object.keys(upd).length > 0) {
          upd.last_scraped_at = new Date();
          upd.scrape_status = 'done';
          await this.recordRepo.update(existing.id, upd);
          progress.updated++;

          if (upd.sire_name || upd.dam_name) {
            await this.resolveRelatives(existing.id, scraped as any);
          }
        }
      } else {
        const saved = await this.recordRepo.save(this.recordRepo.create({
          name: scraped.name,
          birth_year: scraped.birth_year ?? null,
          sex: scraped.sex ?? null,
          color: scraped.color ?? null,
          country_code: scraped.country_code ?? 'ARG',
          sire_name: scraped.sire_name ?? null,
          dam_name: scraped.dam_name ?? null,
          registration_number: scraped.registration_number ?? null,
          registration_source: source,
          source_url: scraped.source_url ?? null,
          scrape_status: 'done',
          data_confidence: scraped.confidence ?? 'medium',
          last_scraped_at: new Date(),
        }));
        progress.imported++;

        if (scraped.sire_name || scraped.dam_name) {
          await this.resolveRelatives(saved.id, scraped as any);
        }
      }
    } catch (err) {
      progress.errors++;
      this.logger.warn(`Error upserting ${scraped.name}: ${(err as Error).message}`);
    }
  }

  // Resuelve sire_id / dam_id creando stubs si no existen
  private async resolveRelatives(recordId: string, scraped: ScrapedHorseRecord): Promise<void> {
    const record = await this.recordRepo.findOne({ where: { id: recordId } });
    if (!record) return;

    const upd: Partial<HorseRecord> = {};

    if (scraped.sire_name && !record.sire_id) {
      const sire = await this.findOrCreateStub(scraped.sire_name);
      if (sire) upd.sire_id = sire.id;
    }
    if (scraped.dam_name && !record.dam_id) {
      const dam = await this.findOrCreateStub(scraped.dam_name);
      if (dam) upd.dam_id = dam.id;
    }

    if (Object.keys(upd).length > 0) {
      await this.recordRepo.update(recordId, upd);
    }
  }

  // ─── BULK IMPORT desde Wikidata ───────────────────────────────────────────
  async bulkImportFromWikidata(minYear = 1990, maxYear = 2020): Promise<string> {
    const running = Array.from(this.jobs.values()).find(
      (j) => j.source === 'wikidata' && j.status === 'running',
    );
    if (running) return running.jobId;

    const jobId = `wikidata_${Date.now()}`;
    const progress: ImportProgress = {
      jobId,
      source: 'wikidata',
      status: 'running',
      startedAt: new Date(),
      processed: 0,
      imported: 0,
      updated: 0,
      errors: 0,
      message: `Importando Wikidata ${minYear}–${maxYear}…`,
    };
    this.jobs.set(jobId, progress);

    setImmediate(() => this.runWikidataImport(progress, minYear, maxYear).catch((e) => {
      progress.status = 'error';
      progress.message = (e as Error).message;
      progress.finishedAt = new Date();
    }));

    return jobId;
  }

  private async runWikidataImport(progress: ImportProgress, minYear: number, maxYear: number): Promise<void> {
    let offset = 0;
    const limit = 200;

    while (true) {
      const batch = await this.wikidata.bulkFetch(minYear, maxYear, offset, limit).catch(() => []);
      if (!batch.length) break;

      for (const scraped of batch) {
        if (!scraped.name?.trim()) continue;
        progress.processed++;
        try {
          const existing = await this.findByNameFuzzy(scraped.name);
          if (existing) {
            const upd: Partial<HorseRecord> = {};
            if (!existing.sire_name && scraped.sire_name) upd.sire_name = scraped.sire_name;
            if (!existing.dam_name  && scraped.dam_name)  upd.dam_name  = scraped.dam_name;
            if (!existing.birth_year && scraped.birth_year) upd.birth_year = scraped.birth_year;
            if (!existing.sex && scraped.sex) upd.sex = scraped.sex;
            if (!existing.color && scraped.color) upd.color = scraped.color;
            if (Object.keys(upd).length) {
              await this.recordRepo.update(existing.id, upd);
              progress.updated++;
            }
          } else {
            await this.recordRepo.save(this.recordRepo.create({
              name: scraped.name.trim(),
              birth_year: scraped.birth_year ?? null,
              sex: scraped.sex ?? null,
              color: scraped.color ?? null,
              breed: scraped.breed ?? null,
              country_code: scraped.country_code ?? null,
              sire_name: scraped.sire_name ?? null,
              dam_name: scraped.dam_name ?? null,
              source_url: scraped.source_url ?? null,
              scrape_status: 'done',
              data_confidence: scraped.confidence,
              registration_source: 'allbreed',
              last_scraped_at: new Date(),
            }));
            progress.imported++;
          }
        } catch { progress.errors++; }
      }

      offset += limit;
      if (batch.length < limit) break;
      await this.delay(1500);
    }

    progress.status = 'done';
    progress.finishedAt = new Date();
    progress.message = `Wikidata: ${progress.imported} nuevos, ${progress.updated} actualizados.`;
  }

  // ─── Cron dominical: busca caballos nuevos en cada libro ────────────────
  // Crawlea el listado de Studbook AR y chequea Wikidata del año en curso.
  // Solo importa lo que no está en nuestra BD — no re-scrapea lo existente.
  @Cron('0 3 * * 0')
  async weeklyNewHorsesCheck(): Promise<void> {
    this.logger.log('Weekly check: scanning studbook for new entries');

    await this.checkStudbookForNewHorses();

    // Wikidata: solo el año anterior y el actual para no re-procesar todo
    const currentYear = new Date().getFullYear();
    const dummyProgress: ImportProgress = {
      jobId: `weekly_wiki_${Date.now()}`,
      source: 'wikidata_weekly',
      status: 'running',
      startedAt: new Date(),
      processed: 0,
      imported: 0,
      updated: 0,
      errors: 0,
    };
    await this.runWikidataImport(dummyProgress, currentYear - 1, currentYear);

    this.logger.log(`Weekly check done — new horses: ${dummyProgress.imported}`);
  }

  private async checkStudbookForNewHorses(): Promise<void> {
    let newCount = 0;

    await this.studbookAr.collectAll(async (item) => {
      const existing = await this.findByNameFuzzy(item.name);
      if (!existing) {
        const dummy: ImportProgress = {
          jobId: '', source: 'studbook_ar_weekly', status: 'running',
          startedAt: new Date(), processed: 0, imported: 0, updated: 0, errors: 0,
        };
        await this.importListItem(item, dummy);
        if (dummy.imported > 0) newCount++;
        await this.delay(500);
      }
    });

    this.logger.log(`Studbook weekly scan: ${newCount} new horses imported`);
  }

  // ─── Cron de cola legacy (registros en pending) ───────────────────────────
  // Solo para foundation horses sembrados en el bootstrap
  @Cron('*/5 * * * *')
  async processPendingQueue(): Promise<void> {
    if (this.drainingQueue) return; // no solapar con la corrida anterior
    this.drainingQueue = true;
    const startedAt = Date.now();
    const MAX_MS = 4 * 60 * 1000; // drena en loop casi hasta el próximo tick, no un solo lote
    try {
      while (Date.now() - startedAt < MAX_MS) {
        const pending = await this.recordRepo.find({
          where: [
            { scrape_status: 'pending' },
            { scrape_status: 'failed', scrape_attempts: LessThan(3) },
          ],
          order: { created_at: 'ASC' },
          take: BATCH_SIZE,
        });

        if (!pending.length) break;

        for (const record of pending) {
          await this.scrapeIndividual(record);
        }
      }
    } finally {
      this.drainingQueue = false;
    }
  }

  // ─── Scrape de un registro individual ────────────────────────────────────
  private async scrapeIndividual(record: HorseRecord): Promise<void> {
    await this.recordRepo.update(record.id, { scrape_status: 'scraping' });
    try {
      const scraped = await this.fetchFromSources(record.name);
      if (!scraped) {
        const attempts = record.scrape_attempts + 1;
        await this.recordRepo.update(record.id, {
          scrape_status: attempts >= 3 ? 'failed' : 'pending',
          scrape_attempts: attempts,
          last_scraped_at: new Date(),
        });
        return;
      }

      const attempts = record.scrape_attempts + 1;
      // Si el fetch no trajo padres (y el registro tampoco los tenía), reintentar
      // de forma acotada: así abuelos/bisabuelos que fallaron en el 1er intento se
      // completan sin depender de re-mapear el sitio. Los foundation reales quedan
      // 'done' tras agotar los reintentos.
      const gotParents = !!(scraped.sire_name || scraped.dam_name || record.sire_id || record.dam_id);
      const updates: Partial<HorseRecord> = {
        scrape_status: (!gotParents && attempts < 3) ? 'pending' : 'done',
        last_scraped_at: new Date(),
        data_confidence: scraped.confidence,
        scrape_attempts: attempts,
      };
      if (scraped.birth_year && !record.birth_year) updates.birth_year = scraped.birth_year;
      if (scraped.sex && !record.sex) updates.sex = scraped.sex;
      if (scraped.color && !record.color) updates.color = scraped.color;
      if (scraped.breed && !record.breed) updates.breed = scraped.breed;
      if (scraped.country_code && !record.country_code) updates.country_code = scraped.country_code;
      if (scraped.registration_number && !record.registration_number)
        updates.registration_number = scraped.registration_number;
      if (scraped.source_url && !record.source_url) updates.source_url = scraped.source_url;

      if (scraped.sire_name && !record.sire_id) {
        const sire = await this.findOrCreateStub(scraped.sire_name);
        if (sire) { updates.sire_id = sire.id; updates.sire_name = sire.name; }
        else       { updates.sire_name = scraped.sire_name; }
      }
      if (scraped.dam_name && !record.dam_id) {
        const dam = await this.findOrCreateStub(scraped.dam_name);
        if (dam) { updates.dam_id = dam.id; updates.dam_name = dam.name; }
        else      { updates.dam_name = scraped.dam_name; }
      }

      await this.recordRepo.update(record.id, updates);
    } catch (err) {
      this.logger.warn(`scrapeIndividual failed for ${record.name}: ${(err as Error).message}`);
      const attempts = record.scrape_attempts + 1;
      await this.recordRepo.update(record.id, {
        scrape_status: attempts >= 3 ? 'failed' : 'pending',
        scrape_attempts: attempts,
        last_scraped_at: new Date(),
      });
    }
  }

  // ─── Re-scrape forzado de un registro específico ──────────────────────────
  async rescrapeOne(id: string): Promise<{ queued: boolean }> {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) throw new Error(`horse_record ${id} not found`);
    await this.recordRepo.update(id, { scrape_status: 'pending', scrape_attempts: 0 });
    setTimeout(() => this.scrapeIndividual({ ...record, scrape_status: 'pending', scrape_attempts: 0 }).catch(() => {}), 300);
    return { queued: true };
  }

  // ─── Reset de todos los fallidos ─────────────────────────────────────────
  async retryAllFailed(): Promise<{ reset: number }> {
    const result = await this.recordRepo
      .createQueryBuilder()
      .update()
      .set({ scrape_status: 'pending', scrape_attempts: 0 })
      .where('scrape_status = :s', { s: 'failed' })
      .execute();
    return { reset: result.affected ?? 0 };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  async getQueueStats() {
    const [pending, done, failed, skipped, total] = await Promise.all([
      this.recordRepo.count({ where: { scrape_status: 'pending' } }),
      this.recordRepo.count({ where: { scrape_status: 'done' } }),
      this.recordRepo.count({ where: { scrape_status: 'failed' } }),
      this.recordRepo.count({ where: { scrape_status: 'skipped' } }),
      this.recordRepo.count(),
    ]);
    return { pending, done, failed, skipped, total };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // Busca y crea un registro stub (para padre/madre desconocidos)
  async findOrCreateStub(name: string): Promise<HorseRecord | null> {
    if (!name?.trim()) return null;
    const existing = await this.findByNameFuzzy(name);
    if (existing) return existing;

    return this.recordRepo.save(this.recordRepo.create({
      name: name.trim(),
      scrape_status: 'pending',
      registration_source: 'studbook_ar',
    }));
  }

  async findByNameFuzzy(name: string): Promise<HorseRecord | null> {
    const normalized = name.trim().toUpperCase();

    const exact = await this.recordRepo
      .createQueryBuilder('r')
      .where('UPPER(r.name) = :name', { name: normalized })
      .getOne();
    if (exact) return exact;

    const candidates = await this.recordRepo
      .createQueryBuilder('r')
      .where('r.name ILIKE :name', { name: `%${name.trim().split(' ')[0]}%` })
      .limit(20)
      .getMany();

    return candidates.find((c) => fuzzyMatchNames(c.name, name)) ?? null;
  }

  // Match exacto (case-insensitive). Usado en bulk import para evitar
  // falsos positivos con homónimos internacionales.
  private async findByNameExact(name: string): Promise<HorseRecord | null> {
    return this.recordRepo
      .createQueryBuilder('r')
      .where('UPPER(r.name) = :name', { name: name.trim().toUpperCase() })
      .getOne();
  }

  // Versión liviana de fetchFromSources para el pipeline de validación de
  // pedigrí. Usa SOLO fuentes rápidas (studbook AR + pedigreequery + wikidata),
  // SIN puppeteer/allbreed, para no arrancar Chrome durante el bootstrap del
  // pedigrí. Devuelve el mejor resultado combinado (padre/madre) o null.
  async scrapeParents(name: string): Promise<{
    sire_name: string | null;
    dam_name: string | null;
    registration_number: string | null;
    confidence: 'high' | 'medium' | 'low';
    source: string;
  } | null> {
    if (!name?.trim()) return null;

    const studbook = await this.studbookAr.scrape(name).catch(() => null);
    const pedigreequery = await this.pedigreeQuery.scrape(name).catch(() => null);
    const wiki = await this.wikidata.scrapeByName(name).catch(() => null);

    const sources: Array<{ src: string; rec: ScrapedHorseRecord }> = (
      [
        studbook ? { src: 'studbook_ar', rec: studbook } : null,
        pedigreequery ? { src: 'pedigreequery', rec: pedigreequery } : null,
        wiki ? { src: 'wikidata', rec: wiki } : null,
      ].filter(Boolean) as Array<{ src: string; rec: ScrapedHorseRecord }>
    );
    if (!sources.length) return null;

    // Base = primera fuente con padre/madre; rellenar campos faltantes del resto.
    const withParents = sources.find((s) => s.rec.sire_name || s.rec.dam_name);
    if (!withParents) return null;

    let best: ScrapedHorseRecord = { ...withParents.rec };
    const source = withParents.src;
    for (const { rec } of sources) {
      if (!best.sire_name && rec.sire_name) best = { ...best, sire_name: rec.sire_name };
      if (!best.dam_name && rec.dam_name) best = { ...best, dam_name: rec.dam_name };
      if (!best.registration_number && rec.registration_number)
        best = { ...best, registration_number: rec.registration_number };
    }

    return {
      sire_name: best.sire_name ?? null,
      dam_name: best.dam_name ?? null,
      registration_number: best.registration_number ?? null,
      confidence: best.confidence,
      source,
    };
  }

  private async fetchFromSources(name: string): Promise<ScrapedHorseRecord | null> {
    // Studbook AR primero (caballos argentinos)
    const studbook = await this.studbookAr.scrape(name).catch(() => null);

    // Wikidata — buena cobertura internacional, sin bot-protection
    const wiki = await this.wikidata.scrapeByName(name).catch(() => null);

    // Allbreed via Puppeteer — solo si las anteriores no tienen pedigree
    let puppeteer: ScrapedHorseRecord | null = null;
    if (!studbook?.sire_name && !wiki?.sire_name) {
      puppeteer = await this.puppeteer.scrapeAllBreed(name).catch(() => null);
    }

    const sources = [studbook, wiki, puppeteer].filter(Boolean) as ScrapedHorseRecord[];
    if (!sources.length) return null;

    let best = sources[0];
    for (const other of sources.slice(1)) {
      if (!best.sire_name  && other.sire_name)  best = { ...best, sire_name:  other.sire_name };
      if (!best.dam_name   && other.dam_name)   best = { ...best, dam_name:   other.dam_name };
      if (!best.birth_year && other.birth_year) best = { ...best, birth_year: other.birth_year };
      if (!best.sex        && other.sex)        best = { ...best, sex:        other.sex };
      if (!best.color      && other.color)      best = { ...best, color:      other.color };
      if (!best.registration_number && other.registration_number)
        best = { ...best, registration_number: other.registration_number };
    }

    return best;
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
