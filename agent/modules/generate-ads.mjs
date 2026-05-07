/**
 * Módulo 5b — Generación de Assets Meta Ads
 * A partir del artículo generado, extrae:
 *   - 3-5 hooks publicitarios
 *   - 2 copies cortos + 1 copy medio
 *   - 1 mensaje principal de valor
 *   - Sugerencias de segmentación y uso
 */
import { chat } from '../utils/ollama.mjs';
import { log } from '../utils/logger.mjs';
import { config } from '../config.mjs';

const SYSTEM = `Eres un especialista en Meta Ads con experiencia en campañas B2B para SaaS y software de gestión para pymes. Conviertes contenido de blog en assets publicitarios de alto impacto: hooks que paran el scroll, copies que generan clic y mensajes que conectan con el dolor real del ICP.`;

/**
 * Generar assets de Meta Ads a partir del artículo.
 * @param {object} article  - Artículo generado (title, content, description...)
 * @param {object} icp      - { type, role, maturity, pains }
 * @returns {Promise<object>} Assets publicitarios
 */
export async function generateAds(article, icp = {}) {
  log.step('MÓDULO 5b · ADS', 'Generando assets para Meta Ads...');

  const icpDesc = [
    icp.type     ? `Empresa: ${icp.type}` : '',
    icp.role     ? `Rol: ${icp.role}` : '',
    icp.pains?.length ? `Dolores: ${icp.pains.join(', ')}` : '',
  ].filter(Boolean).join(' | ') || 'Gerente de pyme española';

  // Usamos los primeros ~1500 palabras del contenido como contexto
  const contentExcerpt = (article.content || '').split(/\s+/).slice(0, 1500).join(' ');

  const prompt = `A partir de este artículo de blog de Drenpos, genera assets para campañas de Meta Ads.

ARTÍCULO:
Título: ${article.title}
Descripción: ${article.description}

Extracto del contenido:
${contentExcerpt}

ICP OBJETIVO: ${icpDesc}

OBJETIVO DE LAS CAMPAÑAS:
- Tráfico al post (awareness / retargeting)
- Captación de leads cualificados
- Remarketing a lectores del post

REGLAS PARA LOS COPIES:
- Frases cortas, impacto inmediato
- Hablar directamente al dolor del ICP
- Sin superlativos vacíos ("el mejor", "increíble")
- Sin signos de exclamación excesivos
- Tono: directo, cercano, de igual a igual
- Generar identificación, no presión

Devuelve JSON con esta estructura exacta:
{
  "hooks": [
    "hook 1 (frase que para el scroll, max 12 palabras)",
    "hook 2",
    "hook 3",
    "hook 4",
    "hook 5"
  ],
  "copiesShort": [
    "Copy corto 1 (2-3 líneas, max 125 chars, para tráfico)",
    "Copy corto 2 (2-3 líneas, max 125 chars, para leads)"
  ],
  "copyMedium": "Copy medio (4-6 líneas, 200-300 chars). Desarrolla el problema, introduce la solución, CTA suave.",
  "mainMessage": "1 frase clara de valor. Lo que Drenpos resuelve para este ICP. Max 15 palabras.",
  "ctaSuggestions": [
    "CTA suave 1 (ej: Leer el artículo completo)",
    "CTA directo 2 (ej: Ver cómo funciona Drenpos)"
  ],
  "audienceSuggestions": {
    "trafficCampaign": "descripción de audiencia para campaña de tráfico",
    "leadCampaign": "descripción de audiencia para campaña de leads",
    "retargetingCampaign": "descripción de audiencia de remarketing"
  },
  "usageNotes": "Nota breve sobre cómo usar estos assets en el funnel (awareness → consideración → conversión)"
}

Responde ÚNICAMENTE con el JSON. Sin texto adicional.`;

  try {
    const raw = await chat(prompt, SYSTEM, {
      temperature: 0.65,
      numCtx: 8192,
      timeout: config.ollama.genTimeout,
    });

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON en respuesta');

    const ads = JSON.parse(match[0]);

    log.success(`${ads.hooks?.length || 0} hooks generados`);
    log.success(`${(ads.copiesShort?.length || 0) + 1} copies generados`);
    log.info(`Mensaje principal: "${ads.mainMessage}"`);

    return ads;
  } catch (e) {
    log.error(`Error generando assets Ads: ${e.message}`);

    // Fallback mínimo funcional
    return {
      hooks: [
        `¿Sigues con ${icp.pains?.[0] || 'estos problemas'} en tu empresa?`,
        `Lo que le está costando a tu empresa no tener un ERP`,
        `El Excel no es un sistema de gestión. Es un parche.`,
        `Cómo las pymes como la tuya están digitalizando sin complicaciones`,
        `Eso que haces manual en tu empresa tiene solución`,
      ],
      copiesShort: [
        `Si todavía gestionas ${icp.pains?.[0] || 'tu negocio'} a mano, este artículo es para ti. Sin tecnicismos. Sin rollos.`,
        `¿Cuánto tiempo pierdes cada semana con procesos que se podrían automatizar? Te lo contamos.`,
      ],
      copyMedium: `Muchas pymes siguen usando hojas de cálculo para gestionar procesos que ya tienen solución. No es un problema de tecnología — es de información. En este artículo explicamos cómo empresas como la tuya lo están resolviendo. Sin grandes inversiones. Sin cambios traumáticos.`,
      mainMessage: `Drenpos ayuda a las pymes a gestionar su negocio sin caos ni papel.`,
      ctaSuggestions: [
        'Leer el artículo completo',
        'Ver cómo funciona Drenpos',
      ],
      audienceSuggestions: {
        trafficCampaign: `${icp.type || 'Pymes'} en España, ${icp.role || 'gerentes y directores'}`,
        leadCampaign: `Remarketing a visitantes del post + lookalike de clientes actuales`,
        retargetingCampaign: `Lectores del post que no convirtieron en los últimos 30 días`,
      },
      usageNotes: 'Usar hooks en creatividades de imagen/vídeo. Copies cortos para tráfico. Copy medio para campañas de leads con formulario. Mensaje principal en creatividades de remarketing.',
    };
  }
}
