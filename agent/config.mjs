import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// ─── Carga automática de agent/.env ─────────────────────────────────────────
// Cargamos antes de leer process.env para que las variables estén disponibles.
// Las variables ya definidas en el entorno tienen prioridad (no se sobreescriben).
const envFile = join(__dirname, '.env');
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;          // ignorar comentarios
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).split('#')[0].trim();  // ignorar comentario inline
    if (key && !(key in process.env)) {                         // no sobreescribir env real
      process.env[key] = val;
    }
  }
}

export const config = {
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:14b',
    // Timeout base para llamadas cortas (análisis, síntesis)
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '180000'),
    // Timeout extendido para generación de artículos completos
    // Modelos grandes (35B+) pueden tardar 5-10 min. Default: 10 min.
    genTimeout: parseInt(process.env.OLLAMA_GEN_TIMEOUT || '600000'),
  },
  blog: {
    postsDir: join(REPO_ROOT, 'src', 'content', 'blog'),
    styleFile: join(REPO_ROOT, 'ai', 'style', 'blog_style.md'),
    author: {
      name: process.env.AUTHOR_NAME || 'Alonso Bermejo Pérez',
      designation: process.env.AUTHOR_DESIGNATION || 'CEO & Founder',
      avatar: process.env.AUTHOR_AVATAR || '/images/alonso.jpg',
    },
  },
  research: {
    maxResults: parseInt(process.env.RESEARCH_MAX_RESULTS || '5'),
    searchEngine: process.env.SEARCH_ENGINE || 'duckduckgo', // 'duckduckgo' | 'serp'
    serpApiKey: process.env.SERP_API_KEY || '',
    pageTimeoutMs: parseInt(process.env.PAGE_TIMEOUT_MS || '12000'),
  },
  git: {
    autoPush: process.env.GIT_AUTO_PUSH !== 'false',
    branch: process.env.GIT_BRANCH || 'main',
    repoRoot: REPO_ROOT,
  },
  images: {
    // Clave de Pexels API (gratuita en https://www.pexels.com/api/)
    // Si está vacía, el pipeline omite las imágenes sin error.
    pexelsApiKey: process.env.PEXELS_API_KEY || '',
  },
};
