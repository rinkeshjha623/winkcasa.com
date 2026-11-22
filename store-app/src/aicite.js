// AI citation tracking. Nobody can read what people type into ChatGPT, Claude or Perplexity, so the prompt list is built from
// the shopper questions and product categories we really see, and is labelled as "likely prompts". The one engine we can test
// automatically is Gemini with Google Search: it shows which sites an AI answer cites, so we can see if WinkCasa is among them.
const DOMAIN = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function ensureAiTable(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS ai_prompts (id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT NOT NULL UNIQUE, source TEXT NOT NULL, checked_at TEXT, cited INTEGER, domains TEXT, snippet TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function promptsFor(cats, questions) {
  const out = [];
  for (const c of cats) {
    const k = String(c).toLowerCase().trim(); if (!k) continue;
    out.push({ prompt: `Best ${k} to buy online in India`, source: 'category' });
    out.push({ prompt: `Where can I buy affordable ${k} online in India?`, source: 'category' });
    out.push({ prompt: `Which brands sell good ${k} online in India, and are they worth it?`, source: 'category' });
  }
  for (const q of questions) { const t = String(q).trim().replace(/\?+$/, ''); if (t.length > 8) out.push({ prompt: cap(t) + '?', source: 'shopper question' }); }
  return out;
}

// Reads a Gemini answer with Google Search grounding: does it mention or cite WinkCasa, and which sites does it cite?
export function parseGrounded(j, brand = 'winkcasa') {
  const cand = j?.candidates?.[0] || {};
  const text = (cand.content?.parts || []).map((p) => p.text || '').join(' ').replace(/\s+/g, ' ').trim();
  const seen = new Set();
  for (const ch of cand.groundingMetadata?.groundingChunks || []) {
    const w = ch.web || {}; let d = String(w.title || '').toLowerCase().trim();
    if (!DOMAIN.test(d)) { try { d = new URL(w.uri).hostname.replace(/^www\./, ''); } catch { d = ''; } }
    if (d) seen.add(d.replace(/^www\./, ''));
  }
  const domains = [...seen].slice(0, 8);
  return { mentioned: new RegExp(brand, 'i').test(text) || domains.some((d) => d.includes(brand)), domains, text };
}

async function ask(env, prompt) {
  const models = [...new Set([env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest'].filter(Boolean))];
  let last = 'no model';
  for (const m of models) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(25000), body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    last = j.error?.message || String(r.status);
  }
  throw new Error('Gemini: ' + last);
}

export async function refreshPrompts(env) {
  await ensureAiTable(env);
  const cats = (await env.DB.prepare("SELECT category FROM keywords WHERE category IS NOT NULL AND category<>'' GROUP BY category ORDER BY SUM(score) DESC LIMIT 10").all()).results.map((r) => r.category);
  const qs = (await env.DB.prepare("SELECT kw FROM keywords WHERE intent='question' ORDER BY score DESC LIMIT 15").all()).results.map((r) => r.kw);
  const list = promptsFor(cats, qs);
  if (list.length) await env.DB.batch(list.map((p) => env.DB.prepare('INSERT OR IGNORE INTO ai_prompts (prompt,source) VALUES (?,?)').bind(p.prompt, p.source)));
  return list.length;
}

export async function checkPrompts(env, n = 4, askFn = ask) {
  await ensureAiTable(env); await refreshPrompts(env);
  if (!env.GEMINI_API_KEY) return { checked: 0, cited: 0, lines: [], note: 'GEMINI_API_KEY is not set.' };
  const rows = (await env.DB.prepare('SELECT id,prompt FROM ai_prompts ORDER BY checked_at IS NOT NULL, checked_at ASC, id ASC LIMIT ?').bind(n).all()).results;
  const lines = []; let cited = 0, checked = 0; const stmts = [];
  for (const r of rows) {
    try {
      const g = parseGrounded(await askFn(env, r.prompt)); checked++; if (g.mentioned) cited++;
      stmts.push(env.DB.prepare("UPDATE ai_prompts SET checked_at=datetime('now'), cited=?, domains=?, snippet=? WHERE id=?").bind(g.mentioned ? 1 : 0, g.domains.join(', '), g.text.slice(0, 280), r.id));
      lines.push(`${g.mentioned ? 'CITED' : 'not cited'}: ${r.prompt} (sources: ${g.domains.join(', ') || 'none shown'})`);
    } catch (e) { lines.push(`failed: ${r.prompt} (${String(e.message || e).slice(0, 100)})`); break; }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return { checked, cited, lines };
}

export async function aiPromptList(env, n = 60) {
  try { await ensureAiTable(env); return (await env.DB.prepare('SELECT prompt,source,checked_at,cited,domains FROM ai_prompts ORDER BY checked_at IS NULL, checked_at DESC, id LIMIT ?').bind(n).all()).results; } catch { return []; }
}
