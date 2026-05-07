/**
 * Módulo 5c — Generación / Obtención de Imágenes
 *
 * Estrategia:
 *   1. El LLM genera 3-4 queries de búsqueda de imágenes basadas en el artículo
 *   2. Se buscan imágenes en Pexels API (requiere PEXELS_API_KEY en .env)
 *   3. Se descargan a public/images/blog/[slug]/
 *   4. Se devuelven con path y alt para inyectar en el contenido
 *
 * Si no hay API key configurada, se omite sin romper el pipeline.
 */
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { chat } from '../utils/ollama.mjs';
import { log } from '../utils/logger.mjs';
import { config } from '../config.mjs';

const PEXELS_API = 'https://api.pexels.com/v1/search';

/**
 * Generar queries de búsqueda de imágenes con el LLM.
 * Devuelve 3-4 queries en inglés (mejor cobertura en Pexels).
 */
async function generateImageQueries(article, icp) {
  const prompt = `For this Spanish blog article about "${article.title}", generate 4 Pexels image search queries in English.

Article description: ${article.description}
Target audience: ${icp.type || 'small business'} / ${icp.role || 'manager'}
Main topic keywords: ${(article.tags || []).join(', ')}

Rules:
- Queries must be in English
- Each query: 2-4 words, specific and visual
- Prefer: business, office, warehouse, retail, people working, technology themes
- Avoid: abstract concepts, logos, text-heavy images
- First query = best for cover image (horizontal, professional)

Return ONLY a JSON array of 4 strings:
["query 1", "query 2", "query 3", "query 4"]`;

  try {
    const raw = await chat(prompt, '', { temperature: 0.3, numCtx: 2048 });
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('No array en respuesta');
    const queries = JSON.parse(match[0]);
    return Array.isArray(queries) ? queries.slice(0, 4) : [];
  } catch (e) {
    log.debug(`Error generando queries: ${e.message}`);
    // Fallback genérico
    return [
      'small business owner office',
      'retail store inventory management',
      'business software dashboard',
      'warehouse workers team',
    ];
  }
}

/**
 * Buscar una imagen en Pexels API y devolver la URL de descarga.
 */
async function searchPexels(query, apiKey) {
  const params = new URLSearchParams({
    query,
    per_page: '5',
    orientation: 'landscape',
    size: 'medium',
  });

  try {
    const res = await fetch(`${PEXELS_API}?${params}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      log.debug(`Pexels ${res.status} para query: "${query}"`);
      return null;
    }

    const data = await res.json();
    const photos = data.photos || [];
    if (photos.length === 0) return null;

    // Elegir foto aleatoria entre las primeras 3 (más variedad)
    const pick = photos[Math.floor(Math.random() * Math.min(3, photos.length))];
    return {
      downloadUrl: pick.src.large,      // ~1200px
      alt: pick.alt || query,
      photographer: pick.photographer,
      pexelsUrl: pick.url,
    };
  } catch (e) {
    log.debug(`Error buscando en Pexels: ${e.message}`);
    return null;
  }
}

/**
 * Descargar una imagen y guardarla localmente.
 * @returns {string|null} Ruta pública /images/blog/[slug]/[name].jpg
 */
async function downloadImage(downloadUrl, destDir, filename) {
  try {
    const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    const destPath = join(destDir, filename);
    await writeFile(destPath, Buffer.from(buffer));
    return destPath;
  } catch (e) {
    log.debug(`Error descargando imagen: ${e.message}`);
    return null;
  }
}

/**
 * Módulo principal: generar queries, buscar, descargar e inyectar imágenes.
 *
 * @param {object} article   - Artículo generado (title, slug, description, tags)
 * @param {object} icp       - ICP para contexto de búsqueda
 * @returns {Promise<Array<{path, alt, localPath}>>}
 *   path      = ruta pública (para usar en markdown): /images/blog/[slug]/cover.jpg
 *   localPath = ruta absoluta del archivo descargado
 *   alt       = texto alternativo
 */
export async function generateImages(article, icp = {}) {
  log.step('MÓDULO 5c · IMÁGENES', 'Buscando y descargando imágenes...');

  const apiKey = config.images.pexelsApiKey;
  if (!apiKey) {
    log.warn('PEXELS_API_KEY no configurada — artículo sin imágenes.');
    log.info('Obtén tu clave gratuita en: https://www.pexels.com/api/');
    return [];
  }

  // 1. Generar queries
  const queries = await generateImageQueries(article, icp);
  log.info(`Queries de imagen: ${queries.join(' | ')}`);

  // 2. Preparar directorio de destino
  const slug = article.slug;
  const publicImagesDir = join(config.git.repoRoot, 'public', 'images', 'blog', slug);
  const publicPath = `/images/blog/${slug}`;

  await mkdir(publicImagesDir, { recursive: true });

  // 3. Buscar y descargar imágenes (máx 3: 1 cover + 2 inline)
  const images = [];
  const imageNames = ['cover', 'section-1', 'section-2'];

  for (let i = 0; i < Math.min(queries.length, 3); i++) {
    const query = queries[i];
    log.debug(`Buscando: "${query}"`);

    const photo = await searchPexels(query, apiKey);
    if (!photo) {
      log.warn(`Sin resultado para: "${query}"`);
      continue;
    }

    const filename = `${imageNames[i]}.jpg`;
    const localPath = await downloadImage(photo.downloadUrl, publicImagesDir, filename);

    if (!localPath) {
      log.warn(`No se pudo descargar imagen para: "${query}"`);
      continue;
    }

    images.push({
      path: `${publicPath}/${filename}`,
      alt: photo.alt,
      localPath,
      photographer: photo.photographer,
      pexelsUrl: photo.pexelsUrl,
      query,
    });

    log.success(`Imagen ${i + 1}: ${filename} — "${photo.alt}" (by ${photo.photographer})`);
  }

  log.success(`${images.length} imagen(es) descargada(s) en public/images/blog/${slug}/`);
  return images;
}
