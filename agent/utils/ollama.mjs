import { config } from '../config.mjs';
import { log } from './logger.mjs';

/**
 * Send a chat request to Ollama.
 * @param {string} userPrompt
 * @param {string} systemPrompt
 * @param {object} options  - model, temperature, numCtx
 * @returns {Promise<string>}
 */
export async function chat(userPrompt, systemPrompt = '', options = {}) {
  const model = options.model || config.ollama.model;
  const body = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      num_ctx: options.numCtx ?? 8192,
    },
  };

  // options.timeout sobreescribe el default de config
  const timeoutMs = options.timeout ?? config.ollama.timeout;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    log.debug(`Ollama request → model=${model}, ctx=${body.options.num_ctx}, timeout=${timeoutMs / 1000}s`);
    const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama API ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.message?.content?.trim() || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check Ollama availability and list models.
 * @returns {Promise<{ok: boolean, models: string[], error?: string}>}
 */
export async function checkOllama() {
  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, models: (data.models || []).map((m) => m.name) };
  } catch (e) {
    return { ok: false, models: [], error: e.message };
  }
}
