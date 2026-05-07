/**
 * Módulo 7 — GitOps
 * git add → git commit → git push
 */
import { execSync } from 'child_process';
import { log } from '../utils/logger.mjs';
import { config } from '../config.mjs';

/**
 * Ejecutar un comando git en el repo raíz.
 */
function git(args, cwd = config.git.repoRoot) {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Ejecutar el pipeline GitOps completo para el archivo generado.
 * @param {string} filename  - e.g. "2025-10-01-mi-articulo.md"
 * @param {string} slug      - e.g. "mi-articulo"
 * @returns {Promise<{success: boolean, output?: string, error?: string}>}
 */
export async function gitOps(filename, slug) {
  log.step('MÓDULO 7 · GITOPS', 'Ejecutando git add → commit → push...');

  const results = [];

  try {
    // git add
    const addOut = git('add .');
    results.push(`git add: OK`);
    log.success('git add .');

    // git commit
    const commitMsg = `feat(blog): ${slug}\n\nArtículo generado por el agente SEO de Drenpos.\nArchivo: src/content/blog/${filename}`;
    const escaped = commitMsg.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const commitOut = git(`commit -m "${escaped}"`);
    results.push(`git commit: ${commitOut.split('\n')[0]}`);
    log.success(`git commit: feat(blog): ${slug}`);

    // git push
    if (config.git.autoPush) {
      const pushOut = git(`push origin ${config.git.branch}`);
      results.push(`git push: OK`);
      log.success(`git push origin ${config.git.branch}`);
    } else {
      log.warn('GIT_AUTO_PUSH=false — push omitido.');
      log.info(`Ejecuta manualmente: git push origin ${config.git.branch}`);
    }

    return { success: true, output: results.join('\n') };
  } catch (e) {
    const errMsg = e.stderr || e.message || String(e);
    log.error(`GitOps falló: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}
