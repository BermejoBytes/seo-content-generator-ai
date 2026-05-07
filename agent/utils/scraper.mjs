import { log } from './logger.mjs';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/**
 * Fetch a URL and return the raw HTML string (or null on failure).
 */
export async function fetchPage(url, timeoutMs = 12000) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) {
      log.debug(`HTTP ${res.status} — ${url}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    log.debug(`fetchPage failed (${url}): ${e.message}`);
    return null;
  }
}

/**
 * Extract clean readable text from HTML.
 * Removes scripts, styles, nav, footer, ads and collapses whitespace.
 * Caps output at ~3000 words.
 */
export function extractText(html) {
  let text = html
    // Remove full tag blocks with content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Cap at 3000 words
  const words = text.split(/\s+/);
  if (words.length > 3000) {
    text = words.slice(0, 3000).join(' ') + ' [...]';
  }
  return text;
}

/**
 * Extract the <title> of a page.
 */
export function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
}

/**
 * Extract all headings (H1–H6) from HTML.
 */
export function extractHeadings(html) {
  const headings = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level: parseInt(m[1], 10), text });
  }
  return headings;
}

/**
 * Count approximate word count of raw text.
 */
export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
