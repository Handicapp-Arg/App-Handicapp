import { load } from 'cheerio';
import { BaseRecordScraper, ScrapedHorseRecord, extractYear, parseSex, parseCountry } from './base-record-scraper';

/**
 * Scraper para pedigreequery.com
 * ~3M caballos, fuerte en PSI mundial.
 * URL: https://www.pedigreequery.com/[horse-name-with-spaces-as-hyphens]
 */
export class PedigreeQueryRecordScraper extends BaseRecordScraper {
  constructor() {
    super('pedigreequery', 'www.pedigreequery.com', 4000);
  }

  protected async doScrape(query: string): Promise<ScrapedHorseRecord | null> {
    const slug = query.trim().replace(/\s+/g, '-').toLowerCase();
    const url  = `https://www.pedigreequery.com/${encodeURIComponent(slug)}`;

    const res = await this.client.get<string>(url, {
      headers: { Referer: 'https://www.pedigreequery.com/' },
      validateStatus: (s) => s < 500,
    }).catch(() => null);

    if (!res || res.status === 404) return null;

    const $ = load(res.data);

    // ─── Nombre ───────────────────────────────────────────────────────────
    const titleRaw = $('title').text().split(/[-|–]/)[0].trim();
    const nameClean = titleRaw.replace(/\s*\(.*?\)\s*/g, '').trim() || query;

    // ─── Año ──────────────────────────────────────────────────────────────
    let birth_year = extractYear(titleRaw);
    if (!birth_year) {
      const bodyText = $.root().text();
      const m = bodyText.match(/(?:foaled?|born?)[:\s]+(\d{4})/i);
      if (m) birth_year = parseInt(m[1], 10);
    }

    // ─── Sexo ─────────────────────────────────────────────────────────────
    let sex: 'macho' | 'hembra' | 'castrado' | null = null;
    $('td').each((_, el) => { if (!sex) sex = parseSex($(el).text()); });

    // ─── País ─────────────────────────────────────────────────────────────
    let country_code: string | null = null;
    const cMatch = titleRaw.match(/\(([A-Z]{2,3})\)/);
    if (cMatch) country_code = parseCountry(cMatch[1]) ?? cMatch[1];

    // ─── Sire / Dam ───────────────────────────────────────────────────────
    // pedigreequery.com usa table.pedigree con td.horse
    const cells = $('table.pedigree td.horse, table.pedigree td[class*="horse"]').toArray();
    let sire_name: string | null = null;
    let dam_name: string | null = null;

    if (cells.length >= 2) {
      sire_name = $(cells[0]).text().trim() || null;
      dam_name  = $(cells[1]).text().trim() || null;
    } else {
      // Fallback: primeros dos links distintos al caballo principal
      const links = $('a').map((_, el) => $(el).text().trim()).get()
        .filter((t) => t.length > 2 && t.toUpperCase() !== nameClean.toUpperCase());
      if (links[0]) sire_name = links[0];
      if (links[1]) dam_name  = links[1];
    }

    if (!sire_name && !dam_name) return null;

    sire_name = sire_name?.replace(/\s*\(.*?\)/g, '').trim() || null;
    dam_name  = dam_name?.replace(/\s*\(.*?\)/g, '').trim() || null;

    return {
      name: nameClean,
      birth_year: birth_year ?? null,
      sex,
      country_code,
      sire_name,
      dam_name,
      source_url: url,
      confidence: 'medium',
    };
  }
}
