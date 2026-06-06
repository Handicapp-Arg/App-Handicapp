import { load } from 'cheerio';
import { BaseScraper, ScrapedPedigree } from './base-scraper';

// Stud Book Argentino — studbook.org.ar
// Estructura de búsqueda no es pública/documentada; implementado como stub
// con intento real. Si la estructura cambia, retorna null gracefully.
export class StudbookArScraper extends BaseScraper {
  constructor() {
    super('studbook_ar', 'studbook.org.ar');
  }

  protected async doScrape(query: string): Promise<ScrapedPedigree | null> {
    try {
      const searchUrl = `https://www.studbook.org.ar/ejemplares/buscar?q=${encodeURIComponent(query)}`;
      const res = await this.client.get<string>(searchUrl, {
        headers: { Referer: 'https://www.studbook.org.ar/' },
      });
      const $ = load(res.data);

      // Intentar extraer primer resultado de búsqueda
      const firstResultLink = $('a[href*="/ejemplares/"]').first().attr('href');
      if (!firstResultLink) return null;

      const detailUrl = firstResultLink.startsWith('http')
        ? firstResultLink
        : `https://www.studbook.org.ar${firstResultLink}`;

      const detail = await this.client.get<string>(detailUrl);
      const $d = load(detail.data);

      // Buscar campos padre/madre en la ficha del ejemplar
      let sireName: string | undefined;
      let damName: string | undefined;
      let registrationNumber: string | undefined;

      $d('tr, .field-row').each((_, el) => {
        const label = $d(el).find('th, .label').text().toLowerCase().trim();
        const value = $d(el).find('td, .value').text().trim();
        if (!value) return;
        if (label.includes('padre') || label.includes('sire')) sireName = value;
        if (label.includes('madre') || label.includes('dam')) damName = value;
        if (label.includes('registro') || label.includes('n°') || label.includes('sba')) registrationNumber = value;
      });

      if (!sireName && !damName) return null;

      return {
        sireName,
        damName,
        registrationNumber,
        confidence: 'high',
        source: this.sourceName,
      };
    } catch {
      // Si el sitio no responde o cambió su estructura, retornar null sin propagar
      return null;
    }
  }
}
