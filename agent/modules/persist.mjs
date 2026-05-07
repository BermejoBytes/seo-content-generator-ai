/**
 * Módulo 6 — Persistencia
 * Guarda dos archivos en src/content/blog/:
 *   1. [slug].md       — el artículo del blog
 *   2. [slug].ads.md   — assets Meta Ads (companion file)
 *
 * Las imágenes se inyectan en el contenido markdown antes de guardar.
 */
import { writeFile, mkdir, readdir, readFile } from "fs/promises";
import { join } from "path";
import { config } from "../config.mjs";
import { log } from "../utils/logger.mjs";

/** Escapa comillas dobles para YAML frontmatter */
const esc = (s = "") => String(s).replace(/"/g, '\\"');

/** Construye el frontmatter YAML del post */
function buildFrontmatter(article, date, coverImagePath = "") {
  const categories = (article.categories || ["Blog"])
    .map((c) => `"${esc(c)}"`)
    .join(", ");
  const tags = (article.tags || []).map((t) => `"${esc(t)}"`).join(", ");
  const image = coverImagePath || article.image || "";
  const featured = article.featured === true ? "true" : "false";

  return `---
title: "${esc(article.title)}"
meta_title: "${esc(article.metaTitle || article.title)}"
description: "${esc(article.description)}"
date: ${date}
image: "${image}"
author:
  name: "${esc(config.blog.author.name)}"
  designation: "${esc(config.blog.author.designation)}"
  avatar: "${config.blog.author.avatar}"
categories: [${categories}]
tags: [${tags}]
featured: ${featured}
draft: false
hero:
  title: "${esc(article.heroTitle || article.title)}"
  description: "${esc(article.heroDescription || article.description)}"
---

`;
}

/**
 * Inyecta imágenes en el contenido markdown después de secciones H2.
 * Inyecta después del 2º y 4º H2 (saltamos el 1º que es el hook).
 * La imagen de cover NO se inyecta aquí (va en el frontmatter).
 */
function injectImages(content, images = []) {
  if (!images || images.length === 0) return content;

  // Las imágenes para inyectar inline (sin la cover, que ya va en frontmatter)
  const inlineImages = images.slice(1); // index 0 = cover
  if (inlineImages.length === 0) return content;

  const lines = content.split("\n");
  const h2Positions = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      h2Positions.push(i);
    }
  }

  // Inyectar después del 2º, 4º H2 (índices 1 y 3)
  const injectTargets = [h2Positions[1], h2Positions[3]].filter(Boolean);

  // Mapa posición → imagen
  const injectionMap = new Map();
  injectTargets.forEach((pos, idx) => {
    if (inlineImages[idx]) {
      injectionMap.set(pos, inlineImages[idx]);
    }
  });

  // Reconstruir: tras el H2 y su primer párrafo, insertar la imagen
  const result = [];
  let pendingImage = null;
  let linesAfterH2 = 0;

  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);

    // Si este H2 tiene imagen asignada, la preparamos
    if (injectionMap.has(i)) {
      pendingImage = injectionMap.get(i);
      linesAfterH2 = 0;
    }

    // Inyectar después de la primera línea de texto tras el H2
    if (pendingImage) {
      linesAfterH2++;
      const isText = lines[i].trim() && !lines[i].startsWith("#");
      const isBlankAfterText = !lines[i].trim() && linesAfterH2 > 2;

      if (isBlankAfterText) {
        result.push(`![${pendingImage.alt}](${pendingImage.path})`);
        result.push("");
        pendingImage = null;
        linesAfterH2 = 0;
      }
    }
  }

  return result.join("\n");
}

/** Construye el companion file de assets Meta Ads */
function buildAdsFile(ads, article, date) {
  const hooks = (ads.hooks || []).map((h, i) => `${i + 1}. ${h}`).join("\n");
  const copiesShort = (ads.copiesShort || [])
    .map((c, i) => `### Copy corto ${i + 1}\n${c}`)
    .join("\n\n");
  const ctaSuggestions = (ads.ctaSuggestions || [])
    .map((c) => `- ${c}`)
    .join("\n");

  return `# Assets Meta Ads — ${article.title}
> Generado automáticamente · Post: \`src/content/blog/${article.slug}.md\` · ${date}

---

## Hooks (scroll-stop)

${hooks}

---

## Copies cortos

${copiesShort}

---

## Copy medio (leads con formulario)

${ads.copyMedium || ""}

---

## Mensaje principal

> **${ads.mainMessage || ""}**

---

## CTAs sugeridos

${ctaSuggestions}

---

## Audiencias sugeridas

| Campaña | Audiencia |
|---------|-----------|
| Tráfico | ${ads.audienceSuggestions?.trafficCampaign || ""} |
| Leads | ${ads.audienceSuggestions?.leadCampaign || ""} |
| Remarketing | ${ads.audienceSuggestions?.retargetingCampaign || ""} |

---

## Notas de uso en el funnel

${ads.usageNotes || ""}
`;
}

/**
 * Desactiva el featured en todos los posts existentes.
 * Busca archivos .md en el directorio de posts y cambia featured: true a featured: false.
 */
async function unfeaturedAllPosts() {
  try {
    const files = await readdir(config.blog.postsDir);
    const mdFiles = files.filter(
      (f) => f.endsWith(".md") && !f.endsWith(".ads.md"),
    );

    let updatedCount = 0;

    for (const file of mdFiles) {
      const filepath = join(config.blog.postsDir, file);
      let content = await readFile(filepath, "utf-8");

      // Buscar y reemplazar featured: true por featured: false
      if (/featured:\s*true/i.test(content)) {
        content = content.replace(/featured:\s*true/gi, "featured: false");
        await writeFile(filepath, content, "utf-8");
        updatedCount++;
        log.info(`  ✓ ${file} → featured: false`);
      }
    }

    if (updatedCount > 0) {
      log.success(`${updatedCount} post(s) actualizado(s) → featured: false`);
    } else {
      log.info("No hay posts con featured: true para actualizar");
    }
  } catch (error) {
    // Si el directorio no existe o está vacío, no pasa nada
    if (error.code !== "ENOENT") {
      log.warn(`Error al desactivar featured en posts: ${error.message}`);
    }
  }
}

/**
 * Persistir artículo + companion ads.
 * @param {object} article    - Artículo generado
 * @param {object} adsAssets  - Assets Meta Ads generados
 * @param {Array}  images     - Imágenes descargadas [{path, alt, localPath}]
 * @returns {Promise<{filepath, filename, adsFilepath, adsFilename, date}>}
 */
export async function persistArticle(article, adsAssets = {}, images = []) {
  log.step("MÓDULO 6 · PERSISTENCIA", "Guardando post y assets de ads...");

  // Si el nuevo artículo es featured, desactivar todos los demás primero
  if (article.featured === true) {
    log.info(
      "El nuevo artículo será destacado. Desactivando otros posts featured...",
    );
    await unfeaturedAllPosts();
  }

  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `${article.slug}.md`;
  const adsFilename = `${article.slug}.ads.md`;

  const filepath = join(config.blog.postsDir, filename);
  const adsFilepath = join(config.blog.postsDir, adsFilename);

  await mkdir(config.blog.postsDir, { recursive: true });

  // Imagen de cover = primera imagen descargada
  const coverImagePath = images[0]?.path || "";

  // Inyectar imágenes inline en el contenido
  const contentWithImages = injectImages(article.content || "", images);

  // 1. Guardar post
  const postContent =
    buildFrontmatter(article, date, coverImagePath) + contentWithImages;
  await writeFile(filepath, postContent, "utf-8");
  log.success(`Post guardado: src/content/blog/${filename}`);

  // 2. Guardar companion ads
  const adsContent = buildAdsFile(adsAssets, article, date);
  await writeFile(adsFilepath, adsContent, "utf-8");
  log.success(`Ads guardados: src/content/blog/${adsFilename}`);

  return { filepath, filename, adsFilepath, adsFilename, date };
}
