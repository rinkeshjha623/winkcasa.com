import { getSettings, activeProducts, categoriesOf, productPath } from './store.js';
import { SITE } from './seo.js';
import { publishedPosts } from './blog.js';

const KEY = '310772f01b7e395fc84a92f085aa82a5';
export async function submitIndexNow(env) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const urlList = [SITE + '/', SITE + '/links', SITE + '/blog', SITE + '/about', SITE + '/contact',
    ...categoriesOf(rows, S).map((c) => SITE + c.path), ...rows.filter((r) => !r.noindex).map((r) => SITE + productPath(r)), ...posts.filter((p) => !p.noindex).map((p) => SITE + '/blog/' + p.slug)];
  const res = await fetch('https://www.bing.com/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'www.winkcasa.com', key: KEY, keyLocation: SITE + '/' + KEY + '.txt', urlList }) });
  return { ok: res.ok, status: res.status, submitted: urlList.length };
}

// Retries every 6 hours until Bing accepts, then once a day. Never throws.
export async function indexNowTick(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key='indexnow'").first();
    let st = {}; try { st = row ? JSON.parse(row.value) : {}; } catch {}
    const age = Date.now() - (st.at || 0);
    if (age < (st.ok ? 86400000 : 21600000)) return;
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('indexnow',?)").bind(JSON.stringify({ ...st, at: Date.now() })).run();
    const r = await submitIndexNow(env);
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('indexnow',?)").bind(JSON.stringify({ at: Date.now(), ok: r.ok, status: r.status, submitted: r.submitted })).run();
  } catch {}
}
