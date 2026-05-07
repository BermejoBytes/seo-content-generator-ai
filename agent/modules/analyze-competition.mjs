/**
 * Módulo 2 — Análisis de Competencia
 * Extrae patrones estructurales y estrategias SEO del corpus.
 * NUNCA copia contenido literal; trabaja sobre patrones abstractos.
 */
import { chat } from '../utils/ollama.mjs';
import { log } from '../utils/logger.mjs';

const SYSTEM = `Eres un analista SEO y editorial experto. Tu trabajo es identificar patrones estructurales, estrategias de posicionamiento y huecos editoriales en contenido de la competencia. NUNCA reproduces ni copias texto literal de los artículos analizados — solo extraes patrones y estrategias abstractas.`;

/** Resultado por defecto cuando no hay corpus o el LLM falla */
function defaultAnalysis(corpus, idea, keywords) {
  return {
    titlePatterns: corpus.map((a) => a.title).slice(0, 3),
    avgWordCount: corpus.length
      ? Math.round(corpus.reduce((s, a) => s + a.wordCount, 0) / corpus.length)
      : 1200,
    commonStructure: ['Introducción al problema', 'Desarrollo con ejemplos', 'Conclusión práctica'],
    seoStrategies: [
      'Keyword principal en el título y primer párrafo',
      'Subtítulos descriptivos con keywords secundarias',
      'Listas y tablas para mejorar scannability',
    ],
    mainProblems: keywords.map((k) => `Cómo gestionar / entender ${k}`),
    narrativeApproaches: ['Guía paso a paso', 'Comparativa de opciones'],
    gaps: [
      'Falta enfoque directo a decisión empresarial real',
      'Sin ejemplos concretos de pymes',
      'Demasiado técnico para no técnicos',
    ],
    avgDepth: 'medio',
    targetAudience: 'Responsables de negocio o IT en pymes',
  };
}

/**
 * Analizar el corpus de competencia con el LLM.
 * @returns {Promise<object>} Análisis estructurado
 */
export async function analyzeCompetition(corpus, idea, keywords) {
  log.step('MÓDULO 2 · ANÁLISIS COMPETENCIA', 'Extrayendo patrones editoriales y SEO...');

  if (corpus.length === 0) {
    log.warn('Corpus vacío — usando análisis base genérico.');
    return defaultAnalysis(corpus, idea, keywords);
  }

  // Construir contexto compacto para el LLM
  const corpusCtx = corpus
    .map(
      (a, i) =>
        `=== Artículo ${i + 1} ===\n` +
        `Título: ${a.title}\n` +
        `URL: ${a.url}\n` +
        `Palabras: ${a.wordCount}\n` +
        `Headings: ${a.headings.map((h) => `H${h.level}:${h.text}`).join(' | ')}\n` +
        `Extracto (primeras 1200 palabras):\n${a.text.substring(0, 1800)}`
    )
    .join('\n\n');

  const prompt = `Analiza este corpus de artículos de competencia sobre el tema: "${idea}"
Keywords objetivo: ${keywords.join(', ')}

${corpusCtx}

Extrae ÚNICAMENTE patrones y estrategias (no copies texto). Devuelve JSON válido con esta estructura exacta:
{
  "titlePatterns": ["patrón de título 1", "patrón 2", "patrón 3"],
  "avgWordCount": 1400,
  "commonStructure": ["sección recurrente 1", "sección 2", "sección 3"],
  "seoStrategies": ["estrategia SEO observada 1", "estrategia 2"],
  "mainProblems": ["problema que atacan los artículos 1", "problema 2"],
  "narrativeApproaches": ["enfoque narrativo 1", "enfoque 2"],
  "gaps": ["hueco o debilidad que NO cubre la competencia 1", "hueco 2"],
  "avgDepth": "superficial|medio|profundo",
  "targetAudience": "perfil del lector objetivo de la competencia"
}

Responde ÚNICAMENTE con el JSON. Sin texto previo ni posterior.`;

  try {
    const raw = await chat(prompt, SYSTEM, { temperature: 0.25, numCtx: 12288 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON en respuesta');
    const result = JSON.parse(match[0]);
    log.success('Análisis de competencia completado');
    log.debug(`Gaps detectados: ${result.gaps?.join(' | ')}`);
    return result;
  } catch (e) {
    log.error(`Error en análisis de competencia: ${e.message}`);
    return defaultAnalysis(corpus, idea, keywords);
  }
}
