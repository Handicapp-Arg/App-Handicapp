import axios from 'axios';
import { ScrapedHorseRecord, parseSex, parseCountry, normalizeName } from './base-record-scraper';

const ENDPOINT = 'https://query.wikidata.org/sparql';

const SPARQL_BY_NAME = (name: string) => `
SELECT ?horseName ?birthYear ?birthDate ?sireName ?damName ?sexLabel ?countryName ?colorLabel WHERE {
  ?horse wdt:P31 wd:Q726 .
  ?horse rdfs:label ?horseName FILTER(LANG(?horseName) = "en")
  FILTER(LCASE(?horseName) = "${name.toLowerCase().replace(/"/g, '\\"')}")
  OPTIONAL { ?horse wdt:P569 ?bd . BIND(YEAR(?bd) AS ?birthYear) BIND(STR(?bd) AS ?birthDate) }
  OPTIONAL { ?horse wdt:P22 ?sire . ?sire rdfs:label ?sireName FILTER(LANG(?sireName) = "en") }
  OPTIONAL { ?horse wdt:P25 ?dam  . ?dam rdfs:label ?damName  FILTER(LANG(?damName)  = "en") }
  OPTIONAL { ?horse wdt:P21 ?sex  . ?sex rdfs:label ?sexLabel  FILTER(LANG(?sexLabel)  = "en") }
  OPTIONAL { ?horse wdt:P17 ?cnt  . ?cnt rdfs:label ?countryName FILTER(LANG(?countryName) = "en") }
  OPTIONAL { ?horse wdt:P462 ?col  . ?col rdfs:label ?colorLabel FILTER(LANG(?colorLabel) = "en") }
} LIMIT 5
`;

// Query para listar caballos notables desde 1990 — usado en el bootstrap
export const SPARQL_BULK = (minYear: number, maxYear: number, offset = 0, limit = 200) => `
SELECT ?horseName ?birthYear ?sireName ?damName ?sexLabel ?countryName WHERE {
  ?horse wdt:P31 wd:Q726 .
  ?horse wdt:P569 ?bd .
  BIND(YEAR(?bd) AS ?birthYear)
  FILTER(?birthYear >= ${minYear} && ?birthYear <= ${maxYear})
  ?horse rdfs:label ?horseName FILTER(LANG(?horseName) = "en")
  OPTIONAL { ?horse wdt:P22 ?sire . ?sire rdfs:label ?sireName FILTER(LANG(?sireName) = "en") }
  OPTIONAL { ?horse wdt:P25 ?dam  . ?dam rdfs:label ?damName  FILTER(LANG(?damName)  = "en") }
  OPTIONAL { ?horse wdt:P21 ?sex  . ?sex rdfs:label ?sexLabel  FILTER(LANG(?sexLabel)  = "en") }
  OPTIONAL { ?horse wdt:P17 ?cnt  . ?cnt rdfs:label ?countryName FILTER(LANG(?countryName) = "en") }
} ORDER BY ?birthYear
LIMIT ${limit} OFFSET ${offset}
`;

interface WikiRow {
  horseName?: { value: string };
  birthYear?: { value: string };
  birthDate?: { value: string };
  sireName?: { value: string };
  damName?: { value: string };
  sexLabel?: { value: string };
  countryName?: { value: string };
  colorLabel?: { value: string };
}

function rowToRecord(row: WikiRow): ScrapedHorseRecord {
  const birth_year = row.birthYear ? parseInt(row.birthYear.value, 10) : null;
  const rawBd = row.birthDate?.value ?? '';
  const birth_date = rawBd.length >= 10 ? rawBd.slice(0, 10) : null;

  return {
    name: row.horseName?.value ?? '',
    birth_year: isNaN(birth_year!) ? null : birth_year,
    birth_date,
    sire_name: row.sireName?.value ?? null,
    dam_name: row.damName?.value ?? null,
    sex: parseSex(row.sexLabel?.value ?? ''),
    color: row.colorLabel?.value ?? null,
    country_code: parseCountry(row.countryName?.value ?? ''),
    breed: 'Thoroughbred',
    source_url: `https://www.wikidata.org`,
    confidence: 'medium',
  };
}

export class WikidataScraper {
  private readonly client = axios.create({ timeout: 20_000 });

  async scrapeByName(name: string): Promise<ScrapedHorseRecord | null> {
    try {
      const { data } = await this.client.get(ENDPOINT, {
        params: { query: SPARQL_BY_NAME(name), format: 'json' },
        headers: { Accept: 'application/json', 'User-Agent': 'HandicApp/1.0' },
      });
      const rows: WikiRow[] = data?.results?.bindings ?? [];
      if (!rows.length) return null;

      // Prefer exact match
      const exact = rows.find(r =>
        normalizeName(r.horseName?.value ?? '') === normalizeName(name)
      ) ?? rows[0];
      return rowToRecord(exact);
    } catch {
      return null;
    }
  }

  async bulkFetch(minYear: number, maxYear: number, offset = 0, limit = 200): Promise<ScrapedHorseRecord[]> {
    try {
      const { data } = await this.client.get(ENDPOINT, {
        params: { query: SPARQL_BULK(minYear, maxYear, offset, limit), format: 'json' },
        headers: { Accept: 'application/json', 'User-Agent': 'HandicApp/1.0' },
      });
      const rows: WikiRow[] = data?.results?.bindings ?? [];
      return rows
        .filter(r => r.horseName?.value)
        .map(rowToRecord);
    } catch {
      return [];
    }
  }
}
