import { load } from 'cheerio';
import { BaseScraper, ScrapedPedigree } from './base-scraper';

export class PedigreeQueryScraper extends BaseScraper {
  constructor() {
    super('pedigreequery', 'pedigreequery.com');
  }

  protected async doScrape(query: string): Promise<ScrapedPedigree | null> {
    const slug = query.trim().replace(/\s+/g, '-');
    const url = `https://www.pedigreequery.com/${encodeURIComponent(slug)}`;

    const res = await this.client.get<string>(url, {
      headers: { Referer: 'https://www.pedigreequery.com/' },
    });

    const $ = load(res.data);

    // pedigreequery.com renders a table where the first row has the horse's sire/dam
    // Structure: table.pedigree > tbody > tr — first data cell is sire, second is dam
    const cells = $('table.pedigree td.horse').toArray();
    if (cells.length < 2) return null;

    const sireName = $(cells[0]).text().trim() || null;
    const damName = $(cells[1]).text().trim() || null;

    if (!sireName && !damName) return null;

    return {
      sireName: sireName ?? undefined,
      damName: damName ?? undefined,
      confidence: 'medium',
      source: this.sourceName,
    };
  }
}
