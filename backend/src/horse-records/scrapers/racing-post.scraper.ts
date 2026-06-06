import { load } from 'cheerio';
import { BaseRecordScraper, ScrapedHorseRecord, extractYear, parseSex, parseCountry } from './base-record-scraper';

/**
 * Scraper para racingpost.com
 * Cubre PSI de UK, Irlanda, Francia, Europa, internacional.
 * Búsqueda: https://www.racingpost.com/horses/horse_home.sd?horse=[name]
 */
export class RacingPostScraper extends BaseRecordScraper {
  constructor() {
    super('racing_post', 'www.racingpost.com', 5000);
  }

  protected async doScrape(query: string): Promise<ScrapedHorseRecord | null> {
    const searchUrl = `https://www.racingpost.com/horses/horse_home.sd?horse=${encodeURIComponent(query)}`;

    const searchRes = await this.client.get<string>(searchUrl, {
      headers: { Referer: 'https://www.racingpost.com/' },
      validateStatus: (s) => s < 500,
    }).catch(() => null);

    if (!searchRes || searchRes.status >= 400) return null;

    const $s = load(searchRes.data);

    // Si la búsqueda redirigió a una ficha directa
    const isHorseProfile = $s('h1[data-test-id="horse-name"], .horse-profile__title').length > 0;

    if (!isHorseProfile) {
      // Es una página de resultados — tomar el primer link de caballo
      const firstHref = $s('a[href*="/profile/horse/"]').first().attr('href');
      if (!firstHref) return null;

      const profileUrl = firstHref.startsWith('http')
        ? firstHref
        : `https://www.racingpost.com${firstHref}`;

      const profileRes = await this.client.get<string>(profileUrl, {
        headers: { Referer: searchUrl },
        validateStatus: (s) => s < 500,
      }).catch(() => null);

      if (!profileRes) return null;
      return this.parseProfile(load(profileRes.data), profileUrl);
    }

    return this.parseProfile($s, searchUrl);
  }

  private parseProfile($: ReturnType<typeof load>, url: string): ScrapedHorseRecord | null {
    const nameRaw = $('h1[data-test-id="horse-name"], .horse-profile__title').first().text().trim();
    if (!nameRaw) return null;

    const nameClean = nameRaw.replace(/\s*\(.*?\)\s*/g, '').trim();

    // Año/fecha de nacimiento
    let birth_year: number | null = null;
    const pageText = $.root().text();
    const foaledMatch = pageText.match(/(?:foaled?|born?)[:\s]+(\d{4}|[\d\w]+ \d{4})/i);
    if (foaledMatch) birth_year = extractYear(foaledMatch[1]);

    // Sexo
    let sex: 'macho' | 'hembra' | 'castrado' | null = null;
    $('[data-test-id="horse-sex"], .horse-profile__sex').each((_, el) => {
      if (!sex) sex = parseSex($(el).text());
    });

    // Color
    let color: string | null = null;
    $('[data-test-id="horse-color"], .horse-profile__colour').each((_, el) => {
      color = color || $(el).text().trim().toLowerCase() || null;
    });

    // País
    let country_code: string | null = null;
    $('[data-test-id="horse-country"], .horse-profile__country').each((_, el) => {
      country_code = country_code || parseCountry($(el).text()) || null;
    });

    // Sire / Dam — Racing Post los muestra como links en la sección de pedigree
    let sire_name: string | null = null;
    let dam_name: string | null = null;

    $('[data-test-id="sire-link"], a[href*="/profile/horse/"]:contains("Sire")').each((_, el) => {
      sire_name = sire_name || $(el).text().trim() || null;
    });
    $('[data-test-id="dam-link"], a[href*="/profile/horse/"]:contains("Dam")').each((_, el) => {
      dam_name = dam_name || $(el).text().trim() || null;
    });

    // Fallback: buscar labels "Sire" / "Dam" en tabla de detalles
    if (!sire_name || !dam_name) {
      $('tr, .detail-row').each((_, el) => {
        const label = $(el).find('th, .label').text().toLowerCase();
        const value = $(el).find('td, .value').text().trim();
        if (!sire_name && label.includes('sire')) sire_name = value.split('\n')[0].trim() || null;
        if (!dam_name  && label.includes('dam'))  dam_name  = value.split('\n')[0].trim() || null;
      });
    }

    if (!sire_name && !dam_name) return null;

    return {
      name: nameClean,
      birth_year,
      sex,
      color,
      country_code,
      sire_name: (sire_name as string | null)?.replace(/\s*\(.*?\)/g, '').trim() || null,
      dam_name:  (dam_name as string | null)?.replace(/\s*\(.*?\)/g, '').trim() || null,
      source_url: url,
      confidence: 'high',
    };
  }
}
