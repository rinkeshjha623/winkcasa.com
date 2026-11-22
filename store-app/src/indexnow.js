import { getSettings, activeProducts, categoriesOf, productPath } from './store.js';
import { SITE } from './seo.js';
import { publishedPosts } from './blog.js';

const KEY = '310772f01b7e395fc84a92f085aa82a5';
const HOUR = 3600000, ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow'];
const readState = async (env) => { const row = await env.DB.prepare("SELECT value FROM settings WHERE key='indexnow'").first(); try { return row ? JSON.parse(row.value) : {}; } catch { return {}; } };
const saveState = (env, st) => env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('indexnow',?)").bind(JSON.stringify(st)).run();

// Sends only URLs not sent before (new products, new posts), everything again once a week, at most once a day.
// Search engines answer 429 when the same list is sent over and over, so after a 429 on every endpoint it waits 24 hours.
export async function submitIndexNow(env, { force } = {}) {
  const st = await readState(env), now = Date.now();
  if (!force) {
    if (st.backoffUntil && now < st.backoffUntil) return { ok: true, skipped: true, submitted: 0, reason: 'waiting after a rate limit (429) from the search engine' };
    if (st.ok && now - (st.okAt || 0) < 20 * HOUR) return { ok: true, skipped: true, submitted: 0, reason: 'already sent in the last 20 hours' };
    if (!st.ok && st.failAt && now - st.failAt < 6 * HOUR) return { ok: true, skipped: true, submitted: 0, reason: 'retrying later after a failed attempt' };
  }
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const all = [SITE + '/', SITE + '/links', SITE + '/blog', SITE + '/about', SITE + '/contact',
    ...categoriesOf(rows, S).map((c) => SITE + c.path), ...rows.filter((r) => !r.noindex).map((r) => SITE + productPath(r)), ...posts.filter((p) => !p.noindex).map((p) => SITE + '/blog/' + p.slug)];
  const sent = new Set(st.sent || []);
  const full = !st.sent || now - (st.fullAt || 0) > 7 * 24 * HOUR;
  const urlList = full ? all : all.filter((u) => !sent.has(u.replace(SITE, '')));
  if (!urlList.length) { await saveState(env, { ...st, ok: true, okAt: now, failAt: 0 }); return { ok: true, skipped: true, submitted: 0, reason: 'nothing new to send' }; }
  let status = 0, rate = false;
  for (const ep of ENDPOINTS) {
    const res = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: 'www.winkcasa.com', key: KEY, keyLocation: SITE + '/' + KEY + '.txt', urlList }) }).catch(() => null);
    status = res ? res.status : 0;
    if (res && res.ok) {
      const nowSent = full ? all.map((u) => u.replace(SITE, '')) : [...new Set([...sent, ...urlList.map((u) => u.replace(SITE, ''))])];
      await saveState(env, { ok: true, okAt: now, status, sent: nowSent, fullAt: full ? now : st.fullAt, submitted: urlList.length });
      return { ok: true, status, submitted: urlList.length };
    }
    if (status === 429) rate = true;
  }
  await saveState(env, { ...st, ok: false, status, failAt: now, backoffUntil: rate ? now + 24 * HOUR : 0 });
  return { ok: false, status, submitted: 0 };
}

// Called from the schedule. The rules above decide whether anything is actually sent. Never throws.
export async function indexNowTick(env) { try { await submitIndexNow(env); } catch {} }
