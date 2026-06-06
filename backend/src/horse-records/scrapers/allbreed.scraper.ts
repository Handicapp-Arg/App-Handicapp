import { load } from 'cheerio';
import { BaseRecordScraper, ScrapedHorseRecord, extractYear, parseSex, parseCountry } from './base-record-scraper';

/**
 * Scraper para allbreedpedigree.com
 * Base de datos más grande del mundo: ~12M caballos de todas las razas y países.
 *
 * URL directa:  https://www.allbreedpedigree.com/[horse+name]
 * URL búsqueda: https://www.allbreedpedigree.com/index.php?query=[name]&search=Find+Horse
 *
 * La página muestra un árbol de pedigree en tabla HTML.
 * Extraemos: nombre, año, padre (sire), madre (dam), país, sexo, color.
 */
export class AllBreedScraper extends BaseRecordScraper {
  constructor() {
    super('allbreed', 'www.allbreedpedigree.com', 5000);
  }

  protected async doScrape(query: string): Promise<ScrapedHorseRecord | null> {
    const slug = query.trim().replace(/\s+/g, '+');

    // Intento 1 — URL directa (más fiable)
    const directUrl = `https://www.allbreedpedigree.com/${encodeURIComponent(slug)}`;
    const result = await this.tryParse(directUrl, query);
    if (result) return result;

    // Intento 2 — búsqueda
    const searchUrl = `https://www.allbreedpedigree.com/index.php?query=${encodeURIComponent(query)}&search=Find+Horse`;
    const searchRes = await this.client.get<string>(searchUrl, {
      headers: { Referer: 'https://www.allbreedpedigree.com/' },
    }).catch(() => null);

    if (!searchRes) return null;

    const $s = load(searchRes.data);
    // Los resultados de búsqueda listan links a fichas
    const firstLink = $s('a[href]').filter((_, el) => {
      const href = $s(el).attr('href') ?? '';
      // El href de fichas es relativo y sólo tiene el nombre (sin path extra)
      return /^\/[a-z0-9+\-% ]+$/i.test(href) && !href.includes('index') && !href.includes('?');
    }).first().attr('href');

    if (!firstLink) return null;
    const detailUrl = `https://www.allbreedpedigree.com${firstLink}`;
    return this.tryParse(detailUrl, query);
  }

  private async tryParse(url: string, originalQuery: string): Promise<ScrapedHorseRecord | null> {
    const res = await this.client.get<string>(url, {
      headers: { Referer: 'https://www.allbreedpedigree.com/' },
      validateStatus: (s) => s < 500,
    }).catch(() => null);

    if (!res || res.status === 404) return null;

    const $ = load(res.data);

    // ─── Nombre del caballo ────────────────────────────────────────────────
    // Aparece en el title como "HORSE NAME - pedigree" o en h1/h2
    const titleRaw = $('title').text().split(/[-|–]/)[0].trim();
    const nameFromH = $('h1, h2').first().text().trim();
    const rawName = nameFromH || titleRaw || originalQuery;

    // Eliminar año entre paréntesis del nombre si viene junto
    const nameClean = rawName.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (!nameClean) return null;

    // ─── Año de nacimiento ─────────────────────────────────────────────────
    // Suele aparecer entre paréntesis junto al nombre, o en un campo "Foaled:"
    const pageText = $.root().text();
    let birth_year = extractYear(rawName);
    if (!birth_year) {
      // Buscar patrones "Foaled: 1998", "b. 1998", "foaled 1998"
      const foaledMatch = pageText.match(/(?:foaled?|born?|b\.)[:\s]+(\d{4})/i);
      if (foaledMatch) birth_year = parseInt(foaledMatch[1], 10);
    }

    // ─── Sexo / Color ──────────────────────────────────────────────────────
    let sex: 'macho' | 'hembra' | 'castrado' | null = null;
    let color: string | null = null;

    // Buscar en elementos que contienen info básica del caballo
    $('td, div.horse-info, .horse-details').each((_, el) => {
      const txt = $(el).text().trim();
      if (!sex) sex = parseSex(txt);
      // Color: bay, chestnut, grey, black, roan…
      const colorMatch = txt.match(/\b(bay|chestnut|grey|gray|black|brown|roan|dun|palomino|buckskin|white|cream)\b/i);
      if (!color && colorMatch) color = colorMatch[1].toLowerCase();
    });

    // ─── País ──────────────────────────────────────────────────────────────
    let country_code: string | null = null;
    const countryMatch = pageText.match(/\(([A-Z]{2,3})\)/);
    if (countryMatch) country_code = parseCountry(countryMatch[1]) ?? countryMatch[1].toUpperCase();

    // ─── Sire y Dam (padre y madre) ────────────────────────────────────────
    // AllBreed muestra la tabla de pedigree donde:
    // - La primera celda de la columna de padres (columna 2) es el SIRE
    // - La segunda celda de la columna de padres es la DAM
    // La estructura exacta varía; probamos varias estrategias.
    let sire_name: string | null = null;
    let dam_name: string | null = null;

    // Estrategia A: tabla con clase "pedigree" o "ped"
    const pedTable = $('table.pedigree, table#pedigree, table[class*="ped"]').first();
    if (pedTable.length) {
      const rows = pedTable.find('tr');
      // Fila 0 suele ser el sire, fila mitad suele ser la dam
      if (rows.length >= 2) {
        // Primera celda de la segunda columna (los padres directos)
        sire_name = $(rows.eq(0)).find('td, th').eq(1).find('a, span').first().text().trim() || null;
        dam_name  = $(rows.eq(Math.floor(rows.length / 2))).find('td, th').eq(1).find('a, span').first().text().trim() || null;
      }
    }

    // Estrategia B: links en la primera columna de padres
    if (!sire_name || !dam_name) {
      const allLinks = $('a').map((_, el) => $(el).text().trim()).get().filter((t) => t.length > 2 && t !== nameClean);
      // El primer link distinto al caballo suele ser el sire, el segundo la dam
      if (!sire_name && allLinks[0]) sire_name = allLinks[0];
      if (!dam_name && allLinks[1]) dam_name = allLinks[1];
    }

    // Estrategia C: buscar etiquetas explícitas "Sire:" / "Dam:"
    $('td, div, span, p').each((_, el) => {
      const txt = $(el).text().trim();
      const sireMatch = txt.match(/^(?:sire|padre)[:\s]+(.+)/i);
      const damMatch  = txt.match(/^(?:dam|madre)[:\s]+(.+)/i);
      if (!sire_name && sireMatch) sire_name = sireMatch[1].split('\n')[0].trim();
      if (!dam_name  && damMatch)  dam_name  = damMatch[1].split('\n')[0].trim();
    });

    // Si no encontramos ni padre ni madre, no es una ficha válida
    if (!sire_name && !dam_name) return null;

    // Limpieza de nombres
    sire_name = sire_name ? sire_name.replace(/\s*\(.*?\)/g, '').trim() || null : null;
    dam_name  = dam_name  ? dam_name.replace(/\s*\(.*?\)/g, '').trim() || null : null;

    return {
      name: nameClean,
      birth_year: birth_year ?? null,
      sex,
      color,
      country_code,
      sire_name,
      dam_name,
      source_url: url,
      confidence: (sire_name && dam_name) ? 'high' : 'medium',
    };
  }
}
