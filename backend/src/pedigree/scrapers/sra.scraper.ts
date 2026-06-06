import { load } from 'cheerio';
import { BaseScraper, ScrapedPedigree } from './base-scraper';

// SRA (Sociedad Rural Argentina) — sra.org.ar
// Registro de razas: Criollo, Cuarto de Milla, Polo
// Nota: los datos del SRA son "informativos y preliminares"
export class SraScraper extends BaseScraper {
  constructor() {
    super('sra', 'sra.org.ar');
  }

  protected async doScrape(query: string): Promise<ScrapedPedigree | null> {
    try {
      const searchUrl = `https://www.sra.org.ar/razas/buscar?nombre=${encodeURIComponent(query)}`;
      const res = await this.client.get<string>(searchUrl, {
        headers: { Referer: 'https://www.sra.org.ar/' },
      });
      const $ = load(res.data);

      let sireName: string | undefined;
      let damName: string | undefined;
      let registrationNumber: string | undefined;

      // Buscar campos en tablas de resultados o ficha
      $('tr').each((_, el) => {
        const label = $('th', el).text().toLowerCase().trim();
        const value = $('td', el).text().trim();
        if (!value) return;
        if (label.includes('padre')) sireName = value;
        if (label.includes('madre')) damName = value;
        if (label.includes('registro') || label.includes('n°')) registrationNumber = value;
      });

      if (!sireName && !damName) return null;

      return {
        sireName,
        damName,
        registrationNumber,
        confidence: 'medium',
        source: this.sourceName,
      };
    } catch {
      return null;
    }
  }
}
