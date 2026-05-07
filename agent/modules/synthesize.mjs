/**
 * Módulo 4 — Síntesis Editorial
 * Combina análisis de competencia + perfil propio + ICP
 * para definir una estrategia orientada a SEO y conversión Ads.
 */
import { chat } from '../utils/ollama.mjs';
import { log } from '../utils/logger.mjs';

const SYSTEM = `Eres un estratega de contenido que trabaja en la intersección de SEO y performance marketing (Meta Ads). Diseñas artículos de blog que posicionan en buscadores Y alimentan campañas publicitarias. Tu foco es el ICP (Ideal Customer Profile): escribes para una persona real con un problema real, no para un algoritmo.`;

/** Fallback cuando el LLM falla */
function fallbackStrategy(idea, keywords, icp) {
  const pain = icp.pains?.[0] || 'procesos manuales que quitan tiempo';
  return {
    articleAngle: `Cómo ${icp.type || 'las pymes'} resuelven ${pain} con tecnología`,
    differentialValue: 'Perspectiva real de negocio, no teoría. Con ejemplos y sin rodeos.',
    icpInsights: {
      coreDesire: `Tener control real de su negocio sin complicaciones`,
      mainFear: `Seguir perdiendo tiempo y dinero por falta de herramientas`,
      currentSolution: `Excel, papel o software desactualizado`,
      triggerToChange: `Un error costoso o un competidor que ya lo ha hecho`,
    },
    hookStrategy: {
      angle: 'Problema/consecuencia real',
      example: `¿Sigues gestionando ${pain} con Excel?`,
    },
    recommendedStructure: [
      { section: 'Hook', purpose: 'Capturar atención con problema real', suggestedH2: `¿Todavía con este problema en tu empresa?` },
      { section: 'Identificación', purpose: 'Hacer que el lector se reconozca', suggestedH2: `Esto le pasa a casi todas las pymes` },
      { section: 'Intensificación', purpose: 'Amplificar el coste real del problema', suggestedH2: `Lo que te cuesta seguir igual` },
      { section: 'Cambio de paradigma', purpose: 'Cuestionar la solución actual', suggestedH2: `Por qué el Excel no es suficiente` },
      { section: 'Solución', purpose: 'Introducir el enfoque de Drenpos suavemente', suggestedH2: `Cómo lo hacen las empresas que ya lo han resuelto` },
      { section: 'CTA', purpose: 'Invitar sin presionar', suggestedH2: `El siguiente paso (sin compromiso)` },
    ],
    seoStrategy: {
      titleFormula: `${idea}: lo que nadie te cuenta`,
      primaryKeyword: keywords[0] || idea,
      secondaryKeywords: keywords.slice(1),
      keywordDensityGuidance: 'Natural. Keyword principal en título, primer párrafo y 1-2 H2.',
    },
    contentPositioning: 'El artículo más honesto y directo sobre el tema. Escrito desde dentro del negocio.',
    toneGuidance: `Habla como un consultor de confianza al ${icp.role || 'gerente'}. Directo, cercano, sin superioridad.`,
    estimatedWordCount: 1300,
    competitionGapsToFill: [
      'Añadir ejemplos con nombres ficticios de pymes concretas',
      'Cuantificar el impacto real (tiempo, dinero, errores)',
      'No vender directamente — posicionar como aliado',
    ],
    adsAlignment: {
      scrollStopAngles: [pain, `tu empresa`, `esto te está pasando`],
      emotionalTriggers: ['frustración', 'alivio', 'control'],
      retargetingSetup: 'Lectores del post → audiencia caliente para campañas de leads',
    },
  };
}

/**
 * Sintetizar la estrategia editorial completa.
 * @param {object} competition - Análisis de competencia
 * @param {object} ownProfile  - Perfil editorial propio
 * @param {string} idea
 * @param {string[]} keywords
 * @param {string} context
 * @param {object} icp         - { type, role, maturity, pains }
 * @returns {Promise<object>}
 */
export async function synthesizeStrategy(competition, ownProfile, idea, keywords, context, icp = {}) {
  log.step('MÓDULO 4 · SÍNTESIS', 'Creando estrategia SEO + Ads con ICP...');

  const icpText = [
    icp.type     ? `Tipo de empresa: ${icp.type}` : '',
    icp.role     ? `Rol objetivo: ${icp.role}` : '',
    icp.maturity ? `Madurez digital: ${icp.maturity}` : '',
    icp.pains?.length ? `Dolores principales: ${icp.pains.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Diseña la estrategia editorial para un artículo de blog de Drenpos.

TEMA: "${idea}"
KEYWORDS: ${keywords.join(', ')}
CONTEXTO: ${context || 'No especificado'}

ICP (IDEAL CUSTOMER PROFILE):
${icpText || 'No especificado — infiere a partir del tema y keywords'}

ANÁLISIS DE COMPETENCIA:
${JSON.stringify(competition, null, 2)}

PERFIL EDITORIAL DRENPOS:
${JSON.stringify(ownProfile, null, 2)}

OBJETIVO DEL ARTÍCULO:
1. Posicionarse en SEO para las keywords objetivo
2. Generar identificación inmediata en el ICP
3. Alimentar campañas de Meta Ads (hooks, copies reutilizables)
4. Preparar al lector para conversión futura (no venta directa)

Diseña una estrategia que SUPERE a la competencia aprovechando los huecos detectados y el estilo propio de Drenpos.

Devuelve JSON con esta estructura exacta:
{
  "articleAngle": "ángulo único del artículo orientado al dolor del ICP",
  "differentialValue": "por qué este artículo es mejor que la competencia",
  "icpInsights": {
    "coreDesire": "qué desea profundamente este ICP",
    "mainFear": "su mayor miedo relacionado con el tema",
    "currentSolution": "cómo lo están resolviendo actualmente (mal)",
    "triggerToChange": "qué les haría cambiar de solución"
  },
  "hookStrategy": {
    "angle": "tipo de hook: problema|consecuencia|pregunta|cifra|contrarian",
    "example": "ejemplo concreto del hook de apertura"
  },
  "recommendedStructure": [
    {
      "section": "nombre del bloque (Hook|Identificación|Intensificación|Cambio de paradigma|Solución|CTA)",
      "purpose": "qué logra este bloque en el lector",
      "suggestedH2": "texto exacto propuesto para el H2"
    }
  ],
  "seoStrategy": {
    "titleFormula": "título SEO ejemplo (máx 65 chars)",
    "primaryKeyword": "keyword principal",
    "secondaryKeywords": ["kw 2", "kw 3"],
    "keywordDensityGuidance": "instrucción concreta"
  },
  "contentPositioning": "cómo posicionar vs competencia",
  "toneGuidance": "instrucciones específicas de tono para este ICP",
  "estimatedWordCount": 1300,
  "competitionGapsToFill": ["hueco real que llenaremos 1", "hueco 2"],
  "adsAlignment": {
    "scrollStopAngles": ["ángulo scroll-stop 1", "ángulo 2"],
    "emotionalTriggers": ["trigger emocional 1", "trigger 2"],
    "retargetingSetup": "cómo usar los lectores del post en campañas de remarketing"
  }
}

Responde ÚNICAMENTE con el JSON. Sin texto adicional.`;

  try {
    const raw = await chat(prompt, SYSTEM, { temperature: 0.4, numCtx: 10240 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON en respuesta');
    const strategy = JSON.parse(match[0]);

    log.success(`Ángulo: "${strategy.articleAngle}"`);
    log.success(`Hook: ${strategy.hookStrategy?.angle} — "${strategy.hookStrategy?.example}"`);
    log.info(`Secciones: ${strategy.recommendedStructure?.length || 0}`);
    return strategy;
  } catch (e) {
    log.error(`Error en síntesis: ${e.message}`);
    return fallbackStrategy(idea, keywords, icp);
  }
}
