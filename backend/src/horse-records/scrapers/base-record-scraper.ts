import axios, { AxiosInstance } from 'axios';

export interface ScrapedHorseRecord {
  name: string;
  birth_year?: number | null;
  birth_date?: string | null;
  sex?: 'macho' | 'hembra' | 'castrado' | null;
  color?: string | null;
  breed?: string | null;
  country_code?: string | null;
  registration_number?: string | null;
  sire_name?: string | null;
  dam_name?: string | null;
  source_url?: string;
  confidence: 'high' | 'medium' | 'low';
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

interface CacheEntry { data: ScrapedHorseRecord | null; expiresAt: number }

export abstract class BaseRecordScraper {
  protected readonly client: AxiosInstance;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly domainLastRequest = new Map<string, number>();
  private uaIndex = 0;

  constructor(
    protected readonly sourceName: string,
    protected readonly domain: string,
    protected readonly rateLimit = 4000, // ms between requests to same domain
  ) {
    this.client = axios.create({
      timeout: 20000,
      headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
  }

  async scrape(query: string): Promise<ScrapedHorseRecord | null> {
    const key = `${this.sourceName}:${query.toLowerCase().trim()}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    await this.applyRateLimit();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.client.defaults.headers['User-Agent'] = USER_AGENTS[this.uaIndex++ % USER_AGENTS.length];
        const result = await this.doScrape(query);
        this.cache.set(key, { data: result, expiresAt: Date.now() + 24 * 3600 * 1000 });
        return result;
      } catch (err) {
        if (attempt < 2) await this.delay([3000, 7000][attempt]);
      }
    }

    this.cache.set(key, { data: null, expiresAt: Date.now() + 3600 * 1000 });
    return null;
  }

  protected abstract doScrape(query: string): Promise<ScrapedHorseRecord | null>;

  private async applyRateLimit() {
    const last = this.domainLastRequest.get(this.domain) ?? 0;
    const wait = this.rateLimit - (Date.now() - last);
    if (wait > 0) await this.delay(wait);
    this.domainLastRequest.set(this.domain, Date.now());
  }

  protected delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// Normalización y fuzzy matching
export function normalizeName(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

export function fuzzyMatchNames(a: string, b: string): boolean {
  const na = normalizeName(a), nb = normalizeName(b);
  if (na === nb) return true;
  const threshold = Math.max(2, Math.floor(Math.min(na.length, nb.length) * 0.15));
  return levenshtein(na, nb) <= threshold;
}

// Extrae año de un string como "(1995)", "b. 1995", "foaled 1995", etc.
export function extractYear(text: string): number | null {
  const m = text.match(/\b(19[0-9]{2}|20[0-2][0-9])\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1900 && y <= new Date().getFullYear() + 1 ? y : null;
}

// Mapea abreviaturas de país a ISO 3166-1 alpha-3
const COUNTRY_MAP: Record<string, string> = {
  'usa': 'USA', 'us': 'USA', 'united states': 'USA',
  'gb': 'GBR', 'uk': 'GBR', 'great britain': 'GBR', 'united kingdom': 'GBR',
  'ire': 'IRL', 'ireland': 'IRL',
  'fra': 'FRA', 'france': 'FRA',
  'ger': 'DEU', 'germany': 'DEU',
  'arg': 'ARG', 'argentina': 'ARG',
  'brz': 'BRA', 'brazil': 'BRA', 'brasil': 'BRA',
  'aus': 'AUS', 'australia': 'AUS',
  'nz': 'NZL', 'new zealand': 'NZL',
  'jpn': 'JPN', 'japan': 'JPN',
  'can': 'CAN', 'canada': 'CAN',
  'ity': 'ITA', 'italy': 'ITA',
  'spa': 'ESP', 'spain': 'ESP',
  'chi': 'CHL', 'chile': 'CHL',
  'per': 'PER', 'peru': 'PER',
  'uru': 'URY', 'uruguay': 'URY',
};

export function parseCountry(text: string): string | null {
  const lower = text.toLowerCase().trim().replace(/[().]/g, '');
  return COUNTRY_MAP[lower] ?? null;
}

// Normaliza color/sexo desde inglés a español
export function parseSex(text: string): 'macho' | 'hembra' | 'castrado' | null {
  const t = text.toLowerCase();
  if (t.includes('stallion') || t.includes('colt') || t.includes('macho') || t === 'm') return 'macho';
  if (t.includes('mare') || t.includes('filly') || t.includes('hembra') || t === 'f') return 'hembra';
  if (t.includes('gelding') || t.includes('castrado') || t === 'g') return 'castrado';
  return null;
}
