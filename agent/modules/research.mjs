/**
 * Módulo 1 — Research
 * Busca artículos de competencia usando DuckDuckGo Lite (o SerpAPI),
 * hace scraping del contenido y devuelve un corpus limpio.
 */
import { config } from '../config.mjs';
import { log } from '../utils/logger.mjs';
import { fetchPage, extractText, extractTitle, extractHeadings, wordCount } from '../utils/scraper.mjs';

// DuckDuckGo Lite — HTML más simple y estable que el endpoint HTML completo
const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/';

/**
 * DDG devuelve sus enlaces como redirects:
 *   //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F...
 * Esta función extrae la URL real del parámetro uddg.
 */
function decodeDDGRedirect(href = '') {
  try {
    const full = href.startsWith('//') ? 'https:' + href : href;
    const url = new URL(full);
    if (url.hostname.includes('duckduckgo.com')) {
      const uddg = url.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);
    }
    // Si ya es una URL directa, devolvemos tal cual
    if (full.startsWith('http')) return full;
  } catch {
    // ignore
  }
  return null;
}

/** Parsear resultados del HTML de DuckDuckGo Lite */
function parseDDGLite(html, max) {
  const results = [];
  const seen = new Set();

  // DDG Lite estructura: <a href="//duckduckgo.com/l/?uddg=...">Title</a>
  const linkRe = /<a[^>]+href="([^"]*duckduckgo\.com\/l\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;

  while ((m = linkRe.exec(html)) !== null && results.length < max) {
    const rawHref = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').trim();

    const url = decodeDDGRedirect(rawHref);
    if (!url) continue;
    if (seen.has(url)) continue;
    if (url.includes('duckduckgo.com')) continue;

    seen.add(url);
    results.push({ url, title: title || url });
  }

  return results;
}

/** Parsear el HTML completo de DuckDuckGo (endpoint /html/) como fallback */
function parseDDGHtml(html, max) {
  const results = [];
  const seen = new Set();

  // Buscar todos los hrefs (redirect o directo)
  const allHrefs = [...html.matchAll(/href="([^"]+)"/g)];

  for (const [, raw] of allHrefs) {
    if (results.length >= max) break;

    let url = null;
    if (raw.includes('duckduckgo.com/l/')) {
      url = decodeDDGRedirect(raw);
    } else if (/^https?:\/\//.test(raw) && !raw.includes('duckduckgo.com')) {
      url = raw;
    }

    if (!url || seen.has(url)) continue;
    seen.add(url);
    results.push({ url, title: url });
  }

  return results;
}

async function searchDuckDuckGo(query, max) {
  const params = new URLSearchParams({ q: query, kl: 'es-es' });

  // 1. Intentar DuckDuckGo Lite (más estable)
  log.debug('Probando DDG Lite...');
  const liteHtml = await fetchPage(`${DDG_LITE_URL}?${params}`, 15000);
  if (liteHtml) {
    const results = parseDDGLite(liteHtml, max);
    if (results.length > 0) {
      log.debug(`DDG Lite: ${results.length} resultados`);
      return results;
    }
    // Fallback: parsear como HTML genérico
    const fallback = parseDDGHtml(liteHtml, max);
    if (fallback.length > 0) {
      log.debug(`DDG Lite fallback: ${fallback.length} resultados`);
      return fallback;
    }
  }

  // 2. Fallback: endpoint HTML completo
  log.debug('Probando DDG HTML completo...');
  const fullHtml = await fetchPage(`https://html.duckduckgo.com/html/?${params}`, 15000);
  if (fullHtml) {
    const results = parseDDGHtml(fullHtml, max);
    if (results.length > 0) {
      log.debug(`DDG HTML: ${results.length} resultados`);
      return results;
    }
  }

  return [];
}

async function searchSerpApi(query, max) {
  const params = new URLSearchParams({
    q: query,
    hl: 'es',
    gl: 'es',
    num: String(max),
    api_key: config.research.serpApiKey,
  });
  const raw = await fetchPage(`https://serpapi.com/search.json?${params}`, 15000);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return (data.organic_results || []).slice(0, max).map((r) => ({
      url: r.link,
      title: r.title,
    }));
  } catch {
    return [];
  }
}

/**
 * Investigar la competencia para una idea + keywords dadas.
 * @returns {Promise<Array<{url, title, text, headings, wordCount}>>}
 */
export async function researchCompetition(idea, keywords) {
  log.step('MÓDULO 1 · RESEARCH', 'Investigando competencia en tiempo real...');

  // Query más corta y directa — mejora resultados DDG
  const queryTerms = [keywords[0] || idea, ...keywords.slice(1, 2)];
  const query = queryTerms.join(' ');
  log.info(`Query de búsqueda: "${query}"`);

  // 1. Search
  let searchResults = [];
  const engine = config.research.searchEngine;

  if (engine === 'serp' && config.research.serpApiKey) {
    log.info('Motor: SerpAPI');
    searchResults = await searchSerpApi(query, config.research.maxResults);
  } else {
    log.info('Motor: DuckDuckGo');
    searchResults = await searchDuckDuckGo(query, config.research.maxResults);
  }

  if (searchResults.length === 0) {
    log.warn('Sin resultados de búsqueda. Continuando sin corpus de competencia.');
    log.warn('Tip: activa DEBUG=true para ver detalles del parser.');
    return [];
  }

  log.info(`${searchResults.length} URLs encontradas. Scrapeando contenido...`);

  // 2. Scrape cada URL
  const corpus = [];
  for (const result of searchResults) {
    log.debug(`Scraping: ${result.url}`);
    const html = await fetchPage(result.url, config.research.pageTimeoutMs);
    if (!html) {
      log.warn(`Sin respuesta: ${result.url}`);
      continue;
    }

    const text = extractText(html);
    const wc = wordCount(text);

    if (wc < 150) {
      log.debug(`Contenido insuficiente (${wc} palabras): ${result.url}`);
      continue;
    }

    const headings = extractHeadings(html);
    const title = result.title && result.title !== result.url
      ? result.title
      : extractTitle(html) || result.url;

    corpus.push({ url: result.url, title, text, headings, wordCount: wc });
    log.success(`OK: "${title}" — ${wc} palabras`);
  }

  log.success(`Corpus final: ${corpus.length} artículos de competencia`);
  return corpus;
}
