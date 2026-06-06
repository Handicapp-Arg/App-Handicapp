import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorseRecord } from './horse-record.entity';
import { HorseRecordsScrapingService } from './horse-records-scraping.service';

/**
 * ~50 foundation sires/mares across PSI, Thoroughbred, Warmblood, Quarter Horse, and Criollo.
 * These seed the BFS scraping queue: from them, sire/dam chains will be followed automatically.
 */
const SEED_HORSES: Array<{ name: string; birth_year?: number; breed?: string; country_code?: string }> = [
  // Thoroughbred — internacional
  { name: 'Northern Dancer',       birth_year: 1961, breed: 'Thoroughbred', country_code: 'CAN' },
  { name: 'Sadlers Wells',         birth_year: 1981, breed: 'Thoroughbred', country_code: 'IRL' },
  { name: 'Galileo',               birth_year: 1998, breed: 'Thoroughbred', country_code: 'IRL' },
  { name: 'Frankel',               birth_year: 2008, breed: 'Thoroughbred', country_code: 'GBR' },
  { name: 'Sea The Stars',         birth_year: 2006, breed: 'Thoroughbred', country_code: 'IRL' },
  { name: 'Danehill',              birth_year: 1986, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Storm Cat',             birth_year: 1983, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Mr Prospector',         birth_year: 1970, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Secretariat',           birth_year: 1970, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Seattle Slew',          birth_year: 1974, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Affirmed',              birth_year: 1975, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Montjeu',               birth_year: 1996, breed: 'Thoroughbred', country_code: 'IRL' },
  { name: 'Dubawi',                birth_year: 2002, breed: 'Thoroughbred', country_code: 'GBR' },
  { name: 'Kingmambo',             birth_year: 1990, breed: 'Thoroughbred', country_code: 'USA' },

  // PSI Argentina / Sudamérica
  { name: 'Roy',                   birth_year: 1993, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Interprete',            birth_year: 1990, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Southern Halo',         birth_year: 1983, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Candy Stripes',         birth_year: 1982, breed: 'Thoroughbred', country_code: 'USA' },
  { name: 'Lode',                  birth_year: 1984, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Ringaro',               birth_year: 1991, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Catcher In The Rye',    birth_year: 1997, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Explosive Bid',         birth_year: 1985, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Recognition',           birth_year: 1989, breed: 'Thoroughbred', country_code: 'ARG' },

  // Quarter Horse — Norteamérica
  { name: 'Easy Jet',              birth_year: 1967, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'Dash For Cash',         birth_year: 1973, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'First Down Dash',       birth_year: 1986, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'Corona Cartel',         birth_year: 1989, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'Tres Seis',             birth_year: 1992, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'Holland Ease',          birth_year: 2001, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'One Famous Eagle',      birth_year: 2001, breed: 'Quarter Horse', country_code: 'USA' },
  { name: 'Apollitical Jess',      birth_year: 2009, breed: 'Quarter Horse', country_code: 'USA' },

  // Warmblood — Salto y doma
  { name: 'Heartbreaker',          birth_year: 1988, breed: 'KWPN', country_code: 'NLD' },
  { name: 'Voltaire',              birth_year: 1980, breed: 'KWPN', country_code: 'NLD' },
  { name: 'Holsteiner Cor de la Bryere', birth_year: 1969, breed: 'Holsteiner', country_code: 'DEU' },
  { name: 'Sandro Hit',            birth_year: 1993, breed: 'Hannoveraner', country_code: 'DEU' },
  { name: 'Donnerhall',            birth_year: 1981, breed: 'Oldenburg', country_code: 'DEU' },
  { name: 'Desperados',            birth_year: 2004, breed: 'Hannoveraner', country_code: 'DEU' },
  { name: 'Valegro',               birth_year: 2002, breed: 'KWPN', country_code: 'GBR' },

  // Criollo Argentino
  { name: 'Malacara',              birth_year: 1960, breed: 'Criollo', country_code: 'ARG' },
  { name: 'Gato',                  birth_year: 1928, breed: 'Criollo', country_code: 'ARG' },
  { name: 'Mancha',                birth_year: 1922, breed: 'Criollo', country_code: 'ARG' },

  // Polo
  { name: 'Adolfo Cambiaso',       birth_year: 1975, breed: 'Polo', country_code: 'ARG' }, // nombre del jugador/criadero
  { name: 'Aiken Cura',            birth_year: 1999, breed: 'Thoroughbred', country_code: 'ARG' },
  { name: 'Lapa',                  birth_year: 2002, breed: 'Polo', country_code: 'ARG' },

  // Frisón / otras razas
  { name: 'Nimmerdor',             birth_year: 1978, breed: 'KWPN', country_code: 'NLD' },
  { name: 'Ferro',                 birth_year: 1990, breed: 'Friesian', country_code: 'NLD' },
];

@Injectable()
export class HorseRecordsBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HorseRecordsBootstrapService.name);

  constructor(
    @InjectRepository(HorseRecord)
    private readonly recordRepo: Repository<HorseRecord>,
    private readonly scraping: HorseRecordsScrapingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    setTimeout(() => this.seedInBackground().catch((e) => this.logger.error('Bootstrap seed failed', e)), 5000);
  }

  async seedInBackground(): Promise<void> {
    const total = await this.recordRepo.count();

    // Seed foundation horses regardless (skip existing ones)
    await this.seedFoundationHorses();

    // Run Wikidata bulk import on first boot (when we have few records)
    if (total < 100) {
      this.logger.log('Running initial Wikidata bulk import (1990-2015)...');
      await this.scraping.bulkImportFromWikidata(1990, 2015).catch(e =>
        this.logger.warn(`Wikidata bulk import failed: ${e.message}`),
      );
    }

    const finalCount = await this.recordRepo.count();
    this.logger.log(`Bootstrap complete. Total horse_records: ${finalCount}`);
  }

  private async seedFoundationHorses(): Promise<void> {
    let added = 0;
    for (const seed of SEED_HORSES) {
      try {
        const existing = await this.scraping.findByNameFuzzy(seed.name);
        if (existing) continue;
        await this.recordRepo.save(this.recordRepo.create({
          name: seed.name,
          birth_year: seed.birth_year ?? null,
          breed: seed.breed ?? null,
          country_code: seed.country_code ?? null,
          scrape_status: 'pending',
          registration_source: 'allbreed',
        }));
        added++;
      } catch { /* skip */ }
    }
    if (added) this.logger.log(`Seeded ${added} foundation horses`);
  }
}
