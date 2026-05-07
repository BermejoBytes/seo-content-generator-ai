/**
 * Módulo 3 — Análisis de Contenido Propio
 * Lee los posts existentes del repositorio y la guía de estilo
 * para construir el perfil editorial de Drenpos.
 */
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { chat } from '../utils/ollama.mjs';
import { log } from '../utils/logger.mjs';
import { config } from '../config.mjs';

const SYSTEM = `Eres un analista de estilo editorial. Estudias artículos de blog de una empresa de software (Drenpos) para extraer su perfil editorial: tono, estilo narrativo, nivel técnico, estructura recurrente, diferenciadores de marca y forma de abordar problemas.`;

function defaultProfile() {
  return {
    tone: 'Directo, claro, sin humo. Enfocado a negocio real. Sin tecnicismos innecesarios.',
    narrativeStyle: 'Problema real → análisis práctico → solución concreta → CTA empresarial',
    technicalLevel: 'medio',
    recurringStructure: [
      'Introducción con problema real del lector',
      'Desarrollo práctico con ejemplos',
      'Solución clara y accionable',
      'Cierre con enfoque empresarial + CTA',
    ],
    brandDifferentiators: [
      'Software ERP + TPV + facturación propio para pymes españolas',
      'Experiencia directa con regulación fiscal española (VERI*FACTU, etc.)',
      'Equipo fundador con mentalidad de negocio, no solo tecnología',
    ],
    problemApproach:
      'Identificar el problema real del empresario, explicar el porqué, y dar la solución más directa posible',
    languagePatterns: [
      'Párrafos cortos (2-4 líneas)',
      'Sin jerga innecesaria',
      'Ejemplos con nombres de pymes ficticias',
      'Uso de negritas para puntos clave',
    ],
    callsToAction: ['Solicitar demo', 'Contactar con el equipo'],
  };
}

/**
 * Analizar el contenido propio del blog de Drenpos.
 * @returns {Promise<object>} Perfil editorial
 */
export async function analyzeOwnContent() {
  log.step('MÓDULO 3 · ANÁLISIS PROPIO', 'Extrayendo perfil editorial de Drenpos...');

  // 1. Leer guía de estilo
  let styleGuide = '';
  if (existsSync(config.blog.styleFile)) {
    styleGuide = readFileSync(config.blog.styleFile, 'utf-8');
    log.success(`Guía de estilo cargada (${styleGuide.length} chars)`);
  } else {
    log.warn('Guía de estilo no encontrada. Usando defaults.');
  }

  // 2. Leer posts existentes (máx 5 para mantener contexto manejable)
  let postsCtx = '';
  try {
    const files = await readdir(config.blog.postsDir);
    const mdFiles = files.filter((f) => f.endsWith('.md') && !f.startsWith('-'));

    const samples = [];
    for (const file of mdFiles.slice(0, 5)) {
      const raw = await readFile(join(config.blog.postsDir, file), 'utf-8');
      // Take first ~2500 chars of each post (frontmatter + start of content)
      samples.push(`--- ${file} ---\n${raw.substring(0, 2500)}`);
    }

    if (samples.length > 0) {
      postsCtx = samples.join('\n\n');
      log.success(`${samples.length} posts cargados para análisis de estilo`);
    }
  } catch (e) {
    log.warn(`Error leyendo posts: ${e.message}`);
  }

  if (!styleGuide && !postsCtx) {
    log.warn('Sin contenido propio disponible — usando perfil editorial base.');
    return defaultProfile();
  }

  const prompt = `Analiza el estilo editorial de Drenpos a partir del siguiente material:

=== GUÍA DE ESTILO ===
${styleGuide || '(No disponible)'}

=== POSTS EXISTENTES (extractos) ===
${postsCtx || '(No disponibles)'}

Devuelve un JSON con el perfil editorial. Estructura exacta:
{
  "tone": "descripción del tono",
  "narrativeStyle": "patrón narrativo predominante",
  "technicalLevel": "básico|medio|técnico",
  "recurringStructure": ["elemento estructural 1", "elemento 2", "elemento 3"],
  "brandDifferentiators": ["diferenciador de marca 1", "diferenciador 2"],
  "problemApproach": "cómo el blog aborda los problemas del lector",
  "languagePatterns": ["patrón de lenguaje 1", "patrón 2"],
  "callsToAction": ["tipo de CTA 1", "tipo CTA 2"]
}

Responde ÚNICAMENTE con el JSON. Sin texto adicional.`;

  try {
    const raw = await chat(prompt, SYSTEM, { temperature: 0.2, numCtx: 10240 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON en respuesta');
    const result = JSON.parse(match[0]);
    log.success('Perfil editorial extraído correctamente');
    return result;
  } catch (e) {
    log.error(`Error en análisis propio: ${e.message}`);
    return defaultProfile();
  }
}
