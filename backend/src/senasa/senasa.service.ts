import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { load } from 'cheerio';

/**
 * Cruce ASISTIDO contra el registro público de SENASA ("Buscador de Acreditados
 * en Sanidad Animal"). Es una consulta best-effort: sirve para orientar al admin
 * al aprobar/rechazar una matrícula, pero NUNCA decide por él.
 *
 * El buscador es un JSF viejo (MyFaces + Ajax4jsf sobre JBoss 4 / Tomcat 5.5).
 * El flujo es: GET inicial → se extrae el `javax.faces.ViewState` y la cookie de
 * sesión → POST del formulario "Buscar" reusando ambos. Los resultados vienen en
 * un <tbody id="Form1:data:tbody_element"> con columnas [Nombre, CUIT, Email,
 * Provincia]. Se paginan de a 10; sólo leemos la primera página (suficiente para
 * asistencia).
 *
 * Degradación: si SENASA no responde, cambia el HTML, o cualquier error → se
 * devuelve `{ available: false }` con la URL para consulta manual. No lanza.
 */

export const SENASA_SEARCH_URL =
  'https://aps2.senasa.gov.ar/registros/faces/publico/personas/tc_veterinariospublico.jsp';

export interface SenasaMatch {
  name: string;
  cuit?: string;
  province?: string;
  email?: string;
}

export type SenasaCheckResult =
  | { available: true; found: boolean; matches: SenasaMatch[]; truncated: boolean; query: string; source_url: string }
  | { available: false; manual_url: string; hint: string; query: string };

// Normaliza: mayúsculas, sin acentos, sin ñ especial → para comparar provincias.
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

// Provincia (texto libre del vet) → código del <select> de SENASA. -1 = todas.
const PROVINCE_CODES: Record<string, string> = {
  'BUENOS AIRES': '1',
  'CATAMARCA': '2',
  'CHACO': '5',
  'CHUBUT': '6',
  'CIUDAD AUTONOMA DE BUENOS AIRES': '0',
  'CABA': '0',
  'CAPITAL FEDERAL': '0',
  'CORDOBA': '3',
  'CORRIENTES': '4',
  'ENTRE RIOS': '7',
  'FORMOSA': '8',
  'JUJUY': '9',
  'LA PAMPA': '10',
  'LA RIOJA': '11',
  'MENDOZA': '12',
  'MISIONES': '13',
  'NEUQUEN': '14',
  'RIO NEGRO': '15',
  'SALTA': '16',
  'SAN JUAN': '17',
  'SAN LUIS': '18',
  'SANTA CRUZ': '19',
  'SANTA FE': '20',
  'SANTIAGO DEL ESTERO': '21',
  'TIERRA DEL FUEGO': '22',
  'TUCUMAN': '23',
};

function provinceCode(province?: string | null): string {
  if (!province) return '-1';
  return PROVINCE_CODES[norm(province)] ?? '-1';
}

// El buscador hace un "contains" sobre "APELLIDO NOMBRE" (sin acentos). Con el
// nombre completo casi nunca matchea por el orden/segundos nombres, así que
// buscamos por un solo token (el apellido). En AR el display suele ser
// "Nombre Apellido" → último token; hacemos fallback al primero por las dudas.
function searchTokens(name: string): string[] {
  const tokens = name.trim().split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return [name.trim()];
  const last = tokens[tokens.length - 1];
  const first = tokens[0];
  return last === first ? [last] : [last, first];
}

@Injectable()
export class SenasaService {
  private readonly logger = new Logger(SenasaService.name);
  private readonly timeoutMs = 8000;
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

  async checkVeterinarian(input: { name?: string | null; province?: string | null }): Promise<SenasaCheckResult> {
    const name = (input.name ?? '').trim();
    const provCode = provinceCode(input.province);

    if (!name) {
      return { available: false, manual_url: SENASA_SEARCH_URL, hint: 'Sin nombre para consultar', query: '' };
    }

    const tokens = searchTokens(name);

    try {
      for (const token of tokens) {
        const matches = await this.runSearch(token, provCode);
        if (matches.length > 0) {
          return {
            available: true,
            found: true,
            matches: matches.slice(0, 10),
            truncated: matches.length >= 10,
            query: token,
            source_url: SENASA_SEARCH_URL,
          };
        }
      }
      // Consultamos OK pero sin coincidencias.
      return {
        available: true,
        found: false,
        matches: [],
        truncated: false,
        query: tokens[0],
        source_url: SENASA_SEARCH_URL,
      };
    } catch (err) {
      // Degradación silenciosa: SENASA caído / HTML cambiado / timeout.
      this.logger.warn(`Consulta SENASA falló (degradando a manual): ${(err as Error)?.message ?? err}`);
      return {
        available: false,
        manual_url: SENASA_SEARCH_URL,
        hint: 'No se pudo consultar SENASA automáticamente. Buscá por nombre y provincia.',
        query: name,
      };
    }
  }

  /** GET para ViewState + cookie → POST del formulario "Buscar". Devuelve matches. */
  private async runSearch(query: string, provinceCodeValue: string): Promise<SenasaMatch[]> {
    // 1) GET inicial
    const getRes = await axios.get(SENASA_SEARCH_URL, {
      timeout: this.timeoutMs,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': this.userAgent },
      // el sitio corre TLS antiguo; validamos igual, axios usa el store del sistema
      maxRedirects: 3,
    });

    const html = Buffer.from(getRes.data).toString('latin1');
    const viewState = /name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/.exec(html)?.[1];
    if (!viewState) throw new Error('ViewState no encontrado en el GET inicial');

    const setCookie = getRes.headers['set-cookie'];
    const cookie = Array.isArray(setCookie)
      ? setCookie.map((c) => c.split(';')[0]).join('; ')
      : '';

    // 2) POST "Buscar" (form-urlencoded, charset latin1)
    const params = new URLSearchParams();
    params.set('Form1:cbTipoRol', '0'); // todos los roles acreditados
    params.set('Form1:_idJsp11', query); // Nombre
    params.set('Form1:_idJsp14', '0'); // tipo doc
    params.set('Form1:_idJsp16', '0'); // nro doc
    params.set('Form1:_idJsp18', ''); // cuit
    params.set('Form1:cbProvincia', provinceCodeValue);
    params.set('Form1:partidos', '0');
    params.set('Form1:localidades', '0');
    params.set('Form1:_idJsp38', 'Buscar'); // botón
    params.set('Form1_SUBMIT', '1');
    params.set('Form1:_link_hidden_', '');
    params.set('Form1:_idcl', '');
    params.set('Form1:scroll_1', '');
    params.set('javax.faces.ViewState', viewState);

    const postRes = await axios.post(SENASA_SEARCH_URL, params.toString(), {
      timeout: this.timeoutMs,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      maxRedirects: 3,
    });

    const resultHtml = Buffer.from(postRes.data).toString('latin1');
    return this.parseResults(resultHtml);
  }

  private parseResults(html: string): SenasaMatch[] {
    const $ = load(html);
    const rows = $('#Form1\\:data\\:tbody_element > tr');
    const matches: SenasaMatch[] = [];

    rows.each((_, tr) => {
      const cells = $(tr).find('td');
      const name = $(cells[0]).text().replace(/\s+/g, ' ').trim();
      if (!name) return;
      const cuit = $(cells[1]).text().replace(/\s+/g, ' ').trim();
      const email = $(cells[2]).text().replace(/\s+/g, ' ').trim();
      const province = $(cells[3]).text().replace(/\s+/g, ' ').trim();
      matches.push({
        name,
        cuit: cuit || undefined,
        email: email || undefined,
        province: province || undefined,
      });
    });

    return matches;
  }
}
