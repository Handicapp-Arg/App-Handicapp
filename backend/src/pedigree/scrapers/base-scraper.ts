import axios, { AxiosInstance } from 'axios';

export interface ScrapedPedigree {
  sireName?: string;
  damName?: string;
  registrationNumber?: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

interface CacheEntry { data: ScrapedPedigree | null; expiresAt: number }

export abstract class BaseScraper {
  protected readonly client: AxiosInstance;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly domainLastRequest = new Map<string, number>();
  private uaIndex = 0;

  constructor(protected readonly sourceName: string, protected readonly domain: string) {
    this.client = axios.create({
      timeout: 15000,
      headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
  }

  async scrape(query: string): Promise<ScrapedPedigree | null> {
    const cacheKey = `${this.sourceName}:${query.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    await this.rateLimit();

    let lastError: Error | null = null;
    const delays = [2000, 4000, 8000];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.client.defaults.headers['User-Agent'] = USER_AGENTS[this.uaIndex % USER_AGENTS.length];
        this.uaIndex++;

        const start = Date.now();
        const result = await this.doScrape(query);
        const duration = Date.now() - start;

        console.log(JSON.stringify({ source: this.sourceName, query, attempt: attempt + 1, status: 'ok', durationMs: duration }));
        this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        return result;
      } catch (err) {
        lastError = err as Error;
        console.log(JSON.stringify({ source: this.sourceName, query, attempt: attempt + 1, status: 'error', error: lastError.message }));
        if (attempt < 2) await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }

    console.error(`[${this.sourceName}] All retries failed for "${query}": ${lastError?.message}`);
    this.cache.set(cacheKey, { data: null, expiresAt: Date.now() + 60 * 60 * 1000 });
    return null;
  }

  protected abstract doScrape(query: string): Promise<ScrapedPedigree | null>;

  private async rateLimit(): Promise<void> {
    const last = this.domainLastRequest.get(this.domain) ?? 0;
    const wait = 3000 - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.domainLastRequest.set(this.domain, Date.now());
  }
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function normalizeStr(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeStr(a), nb = normalizeStr(b);
  return na === nb || levenshtein(na, nb) <= 2;
}
