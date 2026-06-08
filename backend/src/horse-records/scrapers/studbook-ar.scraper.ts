import { load } from 'cheerio';
import { BaseRecordScraper, ScrapedHorseRecord, extractYear, parseSex, fuzzyMatchNames } from './base-record-scraper';

export interface StudbookListItem {
  profileUrl: string;
  name: string;
  // Datos pre-fetched del autocomplete (evita visitar el perfil en bulk import)
  prefetched?: {
    sire_name: string | null;
    dam_name: string | null;
    birth_year: number | null;
    birth_date: string | null;
    sex: 'macho' | 'hembra' | 'castrado' | null;
    color: string | null;
    registration_number: string | null;
  };
}

interface AutocompleteItem {
  id: number;
  text: string;
  padre?: string;
  madre?: string;
  abuelo_materno?: string;
  sexo?: string;
  nacimiento?: string;
  pelo?: string;
  tomo?: number;
  folio?: number;
  url_friendly?: string;
}

/**
 * Scraper para www.studbook.org.ar — Stud Book Argentino (SPC).
 *
 * El sitio es una SPA: el listado carga vía /ejemplares/autocomplete (JSON).
 * bulkList() itera términos de búsqueda A–Z + AA–ZZ para cubrir la BD.
 * fetchProfile() parsea el HTML del perfil individual (funciona por links internos).
 */
export class StudbookArScraper extends BaseRecordScraper {
  static readonly BASE = 'https://www.studbook.org.ar';

  // Todos los términos de búsqueda: letras sueltas + pares → ~702 queries × ≤15 resultados
  private static readonly SEARCH_TERMS = StudbookArScraper.buildSearchTerms();

  private static buildSearchTerms(): string[] {
    const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
    const terms: string[] = [...LETTERS];
    for (const a of LETTERS) {
      for (const b of LETTERS) {
        terms.push(a + b);
      }
    }
    return terms;
  }

  constructor() {
    super('studbook_ar', 'www.studbook.org.ar', 1000);
  }

  // ─── Listado via autocomplete (reemplaza el viejo HTML paginado) ──────────
  // page 1..N mapea al término de búsqueda de ese índice.
  async bulkList(page: number): Promise<{ items: StudbookListItem[]; hasMore: boolean }> {
    const idx = page - 1;
    if (idx >= StudbookArScraper.SEARCH_TERMS.length) return { items: [], hasMore: false };

    const term = StudbookArScraper.SEARCH_TERMS[idx];
    const raw = await this.queryAutocomplete(term);

    const items: StudbookListItem[] = raw
      .filter(r => r.text?.trim())
      .map(r => {
        const birth_date_match = r.nacimiento?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        return {
          profileUrl: `${StudbookArScraper.BASE}/ejemplares/perfil/${r.id}/${r.url_friendly ?? r.text.toLowerCase().replace(/\s+/g, '-')}`,
          name: r.text.trim(),
          prefetched: {
            sire_name: r.padre?.trim() || null,
            dam_name: r.madre?.trim() || null,
            birth_year: r.nacimiento ? extractYear(r.nacimiento) : null,
            birth_date: birth_date_match
              ? `${birth_date_match[3]}-${birth_date_match[2].padStart(2,'0')}-${birth_date_match[1].padStart(2,'0')}`
              : null,
            sex: r.sexo ? this.parseSexES(r.sexo) : null,
            color: r.pelo?.toLowerCase() ?? null,
            registration_number: r.tomo ? `T${r.tomo}-F${r.folio}` : null,
          },
        };
      });

    const hasMore = idx + 1 < StudbookArScraper.SEARCH_TERMS.length;
    return { items, hasMore };
  }

  // Mantener firma compatible con el código existente — no se usa en el nuevo flujo
  async listByLetter(letter: string, page = 1): Promise<{ items: StudbookListItem[]; hasMore: boolean }> {
    if (page > 1) return { items: [], hasMore: false };
    const raw = await this.queryAutocomplete(letter);
    const items = raw
      .filter(r => r.text?.trim())
      .map(r => ({
        profileUrl: `${StudbookArScraper.BASE}/ejemplares/perfil/${r.id}/${r.url_friendly ?? ''}`,
        name: r.text.trim(),
      }));
    return { items, hasMore: false };
  }

  // ─── API de autocomplete ──────────────────────────────────────────────────
  // El endpoint usa term= (no q=) + tipo=1&muerto=1 para obtener resultados reales
  async queryAutocomplete(term: string): Promise<AutocompleteItem[]> {
    const res = await this.client.get<AutocompleteItem[]>(
      `${StudbookArScraper.BASE}/ejemplares/autocomplete`,
      {
        params: { tipo: 1, muerto: 1, term },
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
          Referer: `${StudbookArScraper.BASE}/ejemplares`,
        },
        validateStatus: (s) => s < 500,
      },
    ).catch(() => null);

    if (!res || !Array.isArray(res.data)) return [];
    return res.data;
  }

  // ─── Parseo de perfil individual ─────────────────────────────────────────
  async fetchProfile(profileUrl: string): Promise<ScrapedHorseRecord | null> {
    const res = await this.client.get<string>(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        Referer: `${StudbookArScraper.BASE}/ejemplares`,
      },
      validateStatus: (s) => s < 500,
    }).catch(() => null);

    if (!res || res.status >= 400) return null;

    return this.parsePerfil(res.data, profileUrl);
  }

  private parsePerfil(html: string, url: string): ScrapedHorseRecord | null {
    const $ = load(html);

    const h1 = $('h1').first().text().trim();
    const titleRaw = $('title').text().split(/[-|–|·]/)[0].trim();
    const name = (h1 || titleRaw).replace(/\s*\(.*?\)\s*/g, '').trim();
    if (!name || name.length < 2) return null;

    let birth_year: number | null = null;
    let birth_date: string | null = null;
    let sex: 'macho' | 'hembra' | 'castrado' | null = null;
    let color: string | null = null;
    let sire_name: string | null = null;
    let dam_name: string | null = null;
    let registration_number: string | null = null;

    // Estrategia 1: pares etiqueta/valor en <tr><td>…</td><td>…</td></tr>
    $('tr').each((_, row) => {
      const tds = $(row).find('td');
      if (tds.length < 2) return;
      const label = tds.eq(0).text().trim().toLowerCase().replace(/[:\s]+$/, '');
      const value = tds.eq(1).text().trim();
      if (!value) return;
      this.assignField(label, value, {
        onSire:  (v) => { if (!sire_name)  sire_name  = v; },
        onDam:   (v) => { if (!dam_name)   dam_name   = v; },
        onYear:  (v) => { if (!birth_year) birth_year = v; },
        onDate:  (v) => { if (!birth_date) birth_date = v; },
        onSex:   (v) => { if (!sex)  sex  = v; },
        onColor: (v) => { if (!color) color = v; },
        onReg:   (v) => { if (!registration_number) registration_number = v; },
      });
    });

    // Estrategia 2: etiquetas en texto libre
    if (!sire_name || !dam_name) {
      $('p, div, span, li, dt, dd').each((_, el) => {
        const txt = $(el).text().trim();
        const label = txt.split(/[:\-]/)[0].toLowerCase().trim();
        const value = txt.slice(txt.indexOf(':') + 1).trim().split('\n')[0].trim();
        if (!value) return;
        this.assignField(label, value, {
          onSire:  (v) => { if (!sire_name)  sire_name  = v; },
          onDam:   (v) => { if (!dam_name)   dam_name   = v; },
          onYear:  (v) => { if (!birth_year) birth_year = v; },
          onDate:  (v) => { if (!birth_date) birth_date = v; },
          onSex:   (v) => { if (!sex)  sex  = v; },
          onColor: (v) => { if (!color) color = v; },
          onReg:   (v) => { if (!registration_number) registration_number = v; },
        });
      });
    }

    // Estrategia 3: primer y segundo link a perfil = padre/madre (árbol genealógico)
    if (!sire_name || !dam_name) {
      const seen: string[] = [];
      $('a[href*="/ejemplares/perfil/"]').each((_, el) => {
        const t = $(el).text().trim();
        if (t && t.toUpperCase() !== name.toUpperCase() && !seen.includes(t)) {
          seen.push(t);
        }
      });
      if (!sire_name && seen[0]) sire_name = this.cleanName(seen[0]);
      if (!dam_name  && seen[1]) dam_name  = this.cleanName(seen[1]);
    }

    // Estrategia 4: patrón textual "por PADRE y MADRE" típico del SBA
    if (!sire_name || !dam_name) {
      const bodyText = $('body').text();
      const porMatch = bodyText.match(/\bpor\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\(\)]{1,40})\s+y\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\(\)]{1,40})/i);
      if (porMatch) {
        if (!sire_name) sire_name = this.cleanName(porMatch[1]);
        if (!dam_name)  dam_name  = this.cleanName(porMatch[2]);
      }
    }

    if (!name) return null;

    return {
      name,
      birth_year,
      birth_date,
      sex,
      color,
      sire_name,
      dam_name,
      country_code: 'ARG',
      registration_number,
      source_url: url,
      confidence: (sire_name && dam_name) ? 'high' : (sire_name || dam_name ? 'medium' : 'low'),
    };
  }

  private assignField(
    label: string,
    value: string,
    cb: {
      onSire:  (v: string) => void;
      onDam:   (v: string) => void;
      onYear:  (v: number) => void;
      onDate:  (v: string) => void;
      onSex:   (v: 'macho' | 'hembra' | 'castrado') => void;
      onColor: (v: string) => void;
      onReg:   (v: string) => void;
    },
  ) {
    switch (label) {
      case 'padre': case 'sire': case 'padrillo':
        { const v = this.cleanName(value); if (v) cb.onSire(v); break; }
      case 'madre': case 'dam': case 'yegua madre':
        { const v = this.cleanName(value); if (v) cb.onDam(v); break; }
      case 'año nacimiento': case 'año': case 'nacimiento': case 'año de nacimiento': case 'foaled': {
        const y = extractYear(value);
        if (y) cb.onYear(y);
        // Intenta extraer fecha completa dd/mm/yyyy
        const dm = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dm) cb.onDate(`${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`);
        break;
      }
      case 'sexo': case 'sex':
        { const s = this.parseSexES(value); if (s) cb.onSex(s); break; }
      case 'color': case 'pelo':
        { if (value) cb.onColor(value.toLowerCase()); break; }
      case 'tomo': case 'folio': case 'registro': case 'nro registro':
      case 'número de registro': case 'n° registro': case 'n° reg':
        { if (value) cb.onReg(value); break; }
    }
  }

  private cleanName(raw: string): string | null {
    const s = raw.replace(/\s*\(.*?\)\s*/g, '').replace(/\s{2,}/g, ' ').trim();
    return s.length > 1 ? s : null;
  }

  private parseSexES(text: string): 'macho' | 'hembra' | 'castrado' | null {
    const t = text.toLowerCase().trim();
    if (t.includes('macho') || t.includes('padrillo') || t.includes('potro') || t === 'm') return 'macho';
    if (t.includes('hembra') || t.includes('potranca') || t.includes('yegua') || t === 'h' || t === 'f') return 'hembra';
    if (t.includes('castrado') || t.includes('capado') || t === 'c') return 'castrado';
    return parseSex(text);
  }

  // ─── Búsqueda individual por nombre ──────────────────────────────────────
  protected async doScrape(query: string): Promise<ScrapedHorseRecord | null> {
    // Primero intentar autocomplete (más rápido, ya devuelve padre/madre)
    const results = await this.queryAutocomplete(query);
    const match = results.find(r => fuzzyMatchNames(r.text ?? '', query));

    if (match) {
      const birth_year = match.nacimiento ? extractYear(match.nacimiento) : null;
      const birth_date_match = match.nacimiento?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const birth_date = birth_date_match
        ? `${birth_date_match[3]}-${birth_date_match[2].padStart(2,'0')}-${birth_date_match[1].padStart(2,'0')}`
        : null;

      return {
        name: match.text.trim(),
        birth_year,
        birth_date,
        sex: match.sexo ? this.parseSexES(match.sexo) : null,
        color: match.pelo?.toLowerCase() ?? null,
        sire_name: match.padre?.trim() || null,
        dam_name: match.madre?.trim() || null,
        country_code: 'ARG',
        registration_number: match.tomo ? `T${match.tomo}-F${match.folio}` : null,
        source_url: `${StudbookArScraper.BASE}/ejemplares/perfil/${match.id}/${match.url_friendly ?? ''}`,
        confidence: (match.padre && match.madre) ? 'high' : (match.padre || match.madre ? 'medium' : 'low'),
      };
    }

    // Fallback: ir directo al perfil si encontramos la URL
    const profileUrl = await this.findProfileUrl(query);
    if (!profileUrl) return null;
    return this.fetchProfile(profileUrl);
  }

  private async findProfileUrl(query: string): Promise<string | null> {
    const results = await this.queryAutocomplete(query);
    const match = results.find(r => fuzzyMatchNames(r.text ?? '', query));
    if (!match) return null;
    return `${StudbookArScraper.BASE}/ejemplares/perfil/${match.id}/${match.url_friendly ?? ''}`;
  }
}
