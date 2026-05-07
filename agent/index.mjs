#!/usr/bin/env node
/**
 * Drenpos SEO Blog Agent — con capa Meta Ads
 * ───────────────────────────────────────────
 * Pipeline:
 *   Input → Research → Análisis → Síntesis → Generación → Ads → Persistencia → GitOps
 *
 * Uso:
 *   node agent/index.mjs \
 *     --idea "tu idea" \
 *     --keywords "kw1,kw2,kw3" \
 *     --context "contexto breve" \
 *     --icp-type "pymes de retail" \
 *     --icp-role "gerente,responsable de operaciones" \
 *     --icp-maturity "bajo" \
 *     --icp-pains "control de stock,errores en pedidos,procesos manuales"
 */

import { checkOllama } from "./utils/ollama.mjs";
import { log } from "./utils/logger.mjs";
import { config } from "./config.mjs";
import { researchCompetition } from "./modules/research.mjs";
import { analyzeCompetition } from "./modules/analyze-competition.mjs";
import { analyzeOwnContent } from "./modules/analyze-own.mjs";
import { synthesizeStrategy } from "./modules/synthesize.mjs";
import { generateContent } from "./modules/generate.mjs";
// import { generateAds } from './modules/generate-ads.mjs';
import { generateImages } from "./modules/generate-images.mjs";
import { persistArticle } from "./modules/persist.mjs";
import { gitOps } from "./modules/gitops.mjs";

// ─── CLI arg parser ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    idea: "",
    keywords: [],
    context: "",
    icp: {
      type: "", // tipo de empresa (ej: "pymes industriales")
      role: "", // rol objetivo (ej: "gerente, responsable de almacén")
      maturity: "", // madurez digital: "bajo" | "medio" | "alto"
      pains: [], // dolores principales
    },
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if ((arg === "--idea" || arg === "-i") && next) {
      result.idea = args[++i];
    } else if ((arg === "--keywords" || arg === "-k") && next) {
      result.keywords = args[++i]
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    } else if ((arg === "--context" || arg === "-c") && next) {
      result.context = args[++i];
    } else if (arg === "--icp-type" && next) {
      result.icp.type = args[++i];
    } else if (arg === "--icp-role" && next) {
      result.icp.role = args[++i];
    } else if (arg === "--icp-maturity" && next) {
      result.icp.maturity = args[++i]; // bajo | medio | alto
    } else if (arg === "--icp-pains" && next) {
      result.icp.pains = args[++i]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    } else if (!arg.startsWith("-") && !result.idea) {
      result.idea = arg;
    }
  }

  return result;
}

function printUsage() {
  console.log(`
  Uso: node agent/index.mjs [opciones]

  ── Contenido ──────────────────────────────────────────────
    --idea,        -i  <texto>       Idea principal   (obligatorio)
    --keywords,    -k  <kw1,kw2...>  Keywords SEO separadas por comas
    --context,     -c  <texto>       Contexto breve del artículo

  ── ICP (Ideal Customer Profile) ───────────────────────────
    --icp-type        <texto>        Tipo de empresa  (ej: "pymes retail")
    --icp-role        <texto>        Rol objetivo     (ej: "gerente,director de operaciones")
    --icp-maturity    bajo|medio|alto Madurez digital del target
    --icp-pains       <p1,p2,...>    Dolores principales separados por comas

  ── Variables de entorno (ver agent/.env.example) ──────────
    OLLAMA_URL      http://localhost:11434
    OLLAMA_MODEL    qwen2.5:14b
    GIT_AUTO_PUSH   true | false
    SEARCH_ENGINE   duckduckgo | serp
    DEBUG           true | false

  ── Ejemplo completo ────────────────────────────────────────
    node agent/index.mjs \\
      --idea "Cómo digitalizar el inventario de tu tienda" \\
      --keywords "gestión de inventario,control de stock,ERP pymes" \\
      --context "Para pymes de retail que gestionan el stock en Excel" \\
      --icp-type "pymes de retail" \\
      --icp-role "gerente,responsable de tienda" \\
      --icp-maturity "bajo" \\
      --icp-pains "descontrol de stock,pérdidas por errores,procesos manuales"
`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[1m\x1b[35m  🤖  Drenpos SEO + Ads Blog Agent\x1b[0m\n");

  const { idea, keywords, context, icp } = parseArgs(process.argv);

  if (!idea) {
    printUsage();
    process.exit(1);
  }

  // ── Print input summary ──
  log.info(`Idea:        ${idea}`);
  log.info(
    `Keywords:    ${keywords.length > 0 ? keywords.join(", ") : "(ninguna)"}`,
  );
  log.info(`Contexto:    ${context || "(no especificado)"}`);
  log.info(`ICP tipo:    ${icp.type || "(no especificado)"}`);
  log.info(`ICP rol:     ${icp.role || "(no especificado)"}`);
  log.info(`ICP madurez: ${icp.maturity || "(no especificada)"}`);
  log.info(
    `ICP dolores: ${icp.pains.length > 0 ? icp.pains.join(", ") : "(no especificados)"}`,
  );
  log.info(`Modelo:      ${config.ollama.model}`);
  log.info(
    `Git push:    ${config.git.autoPush ? "habilitado" : "deshabilitado"}`,
  );

  // ── Check Ollama ──
  const ollama = await checkOllama();
  if (!ollama.ok) {
    log.error(
      `Ollama no disponible en ${config.ollama.baseUrl}: ${ollama.error}`,
    );
    log.info("Asegúrate de que Ollama está corriendo: ollama serve");
    process.exit(1);
  }

  const modelBase = config.ollama.model.split(":")[0];
  if (
    ollama.models.length > 0 &&
    !ollama.models.some((m) => m.startsWith(modelBase))
  ) {
    log.warn(`Modelo "${config.ollama.model}" no encontrado en Ollama.`);
    log.warn(`Disponibles: ${ollama.models.join(", ")}`);
    log.warn(`Descárgalo: ollama pull ${config.ollama.model}`);
  } else {
    log.success(`Ollama listo — ${config.ollama.model}`);
  }

  const t0 = Date.now();

  try {
    // ── MÓDULO 1: Research ──
    const corpus = await researchCompetition(idea, keywords);

    // ── MÓDULO 2: Análisis competencia ──
    const competitionAnalysis = await analyzeCompetition(
      corpus,
      idea,
      keywords,
    );

    // ── MÓDULO 3: Análisis propio ──
    const ownProfile = await analyzeOwnContent();

    // ── MÓDULO 4: Síntesis (con ICP) ──
    const strategy = await synthesizeStrategy(
      competitionAnalysis,
      ownProfile,
      idea,
      keywords,
      context,
      icp,
    );

    // ── MÓDULO 5: Generación de contenido (estructura Ads-aligned) ──
    const article = await generateContent(
      strategy,
      idea,
      keywords,
      context,
      icp,
    );

    // // ── MÓDULO 5b: Generación de assets Meta Ads ──
    // const adsAssets = await generateAds(article, icp);

    // ── MÓDULO 5c: Imágenes (Pexels) ──
    const images = await generateImages(article, icp);

    // ── MÓDULO 6: Persistencia (post + imágenes + companion ads) ──
    const { filepath, filename, adsFilename } = await persistArticle(
      article,
      adsAssets,
      images,
    );

    // ── MÓDULO 7: GitOps ──
    const gitResult = await gitOps(filename, article.slug);

    // ── Resultado final ──
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    console.log("\n\x1b[1m\x1b[32m  ✅  Pipeline completado\x1b[0m\n");
    console.log(`  📄  Post     : src/content/blog/${filename}`);
    console.log(`  📣  Ads      : src/content/blog/${adsFilename}`);
    console.log(
      `  🖼   Imágenes : ${images.length > 0 ? images.length + " descargadas en public/images/blog/" + article.slug + "/" : "ninguna (sin PEXELS_API_KEY)"}`,
    );
    console.log(`  📝  Título   : ${article.title}`);
    console.log(`  🔗  Slug     : ${article.slug}`);
    console.log(`  🎯  Hook #1  : ${adsAssets.hooks?.[0] || "—"}`);
    console.log(`  ⏱   Tiempo   : ${elapsed}s\n`);

    if (!gitResult.success) {
      console.log("\x1b[33m  ⚠  Git no completado.\x1b[0m");
      console.log(`  Error: ${gitResult.error}`);
      console.log(
        `  Ejecuta: git add . && git commit -m "feat(blog): ${article.slug}" && git push\n`,
      );
    }

    process.exit(0);
  } catch (e) {
    log.error(`Pipeline fallido: ${e.message}`);
    if (process.env.DEBUG === "true") console.error(e.stack);
    process.exit(1);
  }
}

main();
