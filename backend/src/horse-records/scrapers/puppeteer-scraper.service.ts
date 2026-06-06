import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { load } from 'cheerio';
import { ScrapedHorseRecord, extractYear, parseSex, parseCountry, normalizeName, fuzzyMatchNames } from './base-record-scraper';

// puppeteer-extra + stealth bypass Cloudflare bot detection
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require('puppeteer-extra');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

@Injectable()
export class PuppeteerScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerScraperService.name);
  private browser: any = null;
  private launching = false;

  async getBrowser(): Promise<any> {
    if (this.browser) {
      try { await this.browser.pages(); return this.browser; } catch { this.browser = null; }
    }
    if (this.launching) {
      await new Promise(r => setTimeout(r, 2000));
      return this.browser ?? this.getBrowser();
    }
    this.launching = true;
    try {
      this.browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
          '--no-first-run', '--no-zygote', '--single-process',
          '--disable-gpu', '--disable-extensions',
        ],
      });
      this.logger.log('Puppeteer browser launched');
    } finally {
      this.launching = false;
    }
    return this.browser;
  }

  async fetchWithBrowser(url: string, waitFor?: string, timeoutMs = 30_000): Promise<string | null> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setDefaultNavigationTimeout(timeoutMs);
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });

      // Wait for Cloudflare challenge to resolve (up to 10 extra seconds)
      if (waitFor) {
        try { await page.waitForSelector(waitFor, { timeout: 10_000 }); } catch { /* ok */ }
      } else {
        // Generic: wait until title doesn't say "Just a moment"
        await page.waitForFunction(
          () => !document.title.includes('Just a moment'),
          { timeout: 12_000 }
        ).catch(() => {});
      }

      return await page.content();
    } catch (err) {
      this.logger.warn(`Puppeteer fetch failed for ${url}: ${(err as Error).message}`);
      return null;
    } finally {
      await page.close().catch(() => {});
    }
  }

  // ─── AllBreed with Puppeteer ──────────────────────────────────────────────
  async scrapeAllBreed(query: string): Promise<ScrapedHorseRecord | null> {
    const slug = query.trim().toLowerCase().replace(/\s+/g, '+');
    const url = `https://www.allbreedpedigree.com/${encodeURIComponent(slug)}`;

    this.logger.debug(`Puppeteer scraping allbreed: ${url}`);
    const html = await this.fetchWithBrowser(url, 'table.pedigree, #horse_pedigree, h1');
    if (!html) return null;

    return this.parseAllBreed(html, query, url);
  }

  private parseAllBreed(html: string, originalQuery: string, url: string): ScrapedHorseRecord | null {
    const $ = load(html);

    // Name from title
    const titleRaw = $('title').text().split(/[-|–]/)[0].trim();
    const name = titleRaw || $('h1, h2').first().text().trim();
    if (!name || name.toLowerCase().includes('just a moment')) return null;

    // Match against query
    if (!fuzzyMatchNames(name, originalQuery)) return null;

    // Birth year from page text
    const pageText = $('body').text();
    const birth_year = extractYear($('td:contains("Foaled"), td:contains("Born"), .horse_year').first().text())
      ?? extractYear(pageText);

    // Sire and dam — in allbreed they're in the first cells of the pedigree table
    const cells = $('table').first().find('td a');
    const sire_name = cells.eq(0).text().trim() || null;
    const dam_name  = cells.eq(1).text().trim() || null;

    const sexText = $('td:contains("Sex"), td:contains("Gelding"), td:contains("Mare"), td:contains("Stallion")').first().text();
    const sex = parseSex(sexText);

    const colorText = $('td:contains("Bay"), td:contains("Chestnut"), td:contains("Grey"), td:contains("Black"), td:contains("Roan")').first().text();
    const color = colorText.match(/\b(Bay|Chestnut|Grey|Gray|Black|Roan|Dun|Palomino|Buckskin|Sorrel)\b/i)?.[1] ?? null;

    return {
      name,
      birth_year,
      sire_name,
      dam_name,
      sex,
      color,
      country_code: null,
      source_url: url,
      confidence: sire_name ? 'high' : 'medium',
    };
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}
