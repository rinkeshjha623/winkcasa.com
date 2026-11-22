import { suggestGoogle } from './keywords.js';
// Market watch, public-conversation research, Keyword Planner import and topic picking.
const seen = new WeakSet();
export async function ensureAgentTables(env) {
  if (seen.has(env.DB)) return; seen.add(env.DB);
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS intel (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, source TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE, published TEXT, seen_at TEXT NOT NULL DEFAULT (datetime('now')))"),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_intel_seen ON intel (seen_at)'),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS keyword_metrics (kw TEXT PRIMARY KEY, volume INTEGER, competition TEXT, impressions INTEGER, position REAL, source TEXT NOT NULL DEFAULT 'planner', at TEXT NOT NULL DEFAULT (datetime('now')))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS topic_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, kw TEXT NOT NULL, why TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', brief TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))"),
  ]);
  await env.DB.prepare('ALTER TABLE topic_queue ADD COLUMN brief TEXT').run().catch(() => {}); // tables made before briefs existed
}

const decode = (s) => String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
export function parseFeed(xml) {
  const out = [];
  const blocks = String(xml || '').match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  for (const b of blocks) {
    const t = /<title[^>]*>([\s\S]*?)<\/title>/.exec(b);
    const l = /<link[^>]*href=["']([^"']+)["']/.exec(b) || /<link[^>]*>([\s\S]*?)<\/link>/.exec(b);
    const d = /<(pubDate|updated|published)>([\s\S]*?)<\//.exec(b);
    const title = t ? decode(t[1]) : '', url = l ? decode(l[1]) : '';
    if (title && /^https?:\/\//.test(url)) out.push({ title: title.slice(0, 240), url: url.slice(0, 500), published: d ? decode(d[2]) : null });
  }
  return out;
}

const toNum = (s) => { const m = /([\d][\d,.]*)\s*([KkMm])?/.exec(String(s || '')); if (!m) return null; let n = parseFloat(m[1].replace(/,/g, '')); if (m[2]) n *= /k/i.test(m[2]) ? 1000 : 1000000; return Math.round(n); };
const splitCsv = (line, d) => { const o = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === d && !q) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o.map((x) => x.trim()); };
// Google Keyword Planner exports: a title line or two, then Keyword, Currency, Avg. monthly searches, Competition ...
export function parsePlannerCsv(text) {
  const lines = String(text || '').replace(/\r/g, '').replace(/^﻿/, '').split('\n').filter((l) => l.trim());
  const hi = lines.findIndex((l) => /keyword/i.test(l) && /(avg\.? monthly searches|searches)/i.test(l));
  if (hi < 0) return [];
  const d = lines[hi].includes('\t') ? '\t' : ',';
  const head = splitCsv(lines[hi], d).map((h) => h.toLowerCase());
  const ik = head.findIndex((h) => h === 'keyword'), iv = head.findIndex((h) => /monthly searches|^searches/.test(h)), ic = head.findIndex((h) => h === 'competition');
  if (ik < 0 || iv < 0) return [];
  const rows = [];
  for (const line of lines.slice(hi + 1)) {
    const c = splitCsv(line, d); const kw = (c[ik] || '').toLowerCase(); const volume = toNum(c[iv]);
    if (!kw || volume == null) continue;
    const comp = ic >= 0 ? (c[ic] || '').toLowerCase() : '';
    rows.push({ kw, volume, competition: /^(low|medium|high)$/.test(comp) ? comp : null });
  }
  return rows;
}
export async function importPlanner(env, csv) {
  await ensureAgentTables(env);
  const rows = parsePlannerCsv(csv).slice(0, 3000);
  for (let i = 0; i < rows.length; i += 40) await env.DB.batch(rows.slice(i, i + 40).map((r) => env.DB.prepare("INSERT INTO keyword_metrics (kw,volume,competition,source,at) VALUES (?,?,?,'planner',datetime('now')) ON CONFLICT(kw) DO UPDATE SET volume=excluded.volume, competition=excluded.competition, source='planner', at=datetime('now')").bind(r.kw, r.volume, r.competition)));
  return rows.length;
}

const fmt = (n) => Number(n).toLocaleString('en-IN');
// Highest searches with Low or Medium competition first. Known-High competition is never chosen. Without data, falls back to suggestion score and says so.
export function pickTopics(cands, n) {
  const withData = cands.filter((c) => c.volume != null && (c.competition === 'low' || c.competition === 'medium'))
    .sort((a, b) => b.volume - a.volume || (b.competitor ? 1 : 0) - (a.competitor ? 1 : 0) || (a.competition === 'low' ? -1 : 1) - (b.competition === 'low' ? -1 : 1));
  const picks = withData.slice(0, n).map((c) => ({ kw: c.kw, why: `About ${fmt(c.volume)} searches a month, ${c.competition} competition (Keyword Planner)` + (c.competitor ? '. Competitors already publish on this' : '') }));
  if (picks.length < n) {
    const rest = cands.filter((c) => c.volume == null && !c.competition).sort((a, b) => (b.competitor ? 1 : 0) - (a.competitor ? 1 : 0) || b.score - a.score).slice(0, n - picks.length);
    for (const c of rest) picks.push({ kw: c.kw, why: `No volume data yet (upload a Keyword Planner CSV); chosen on suggestion score ${c.score}` + (c.competitor ? '. Competitors already publish on this' : '') });
  }
  return picks;
}

// "People also ask"-style questions. Google's real People Also Ask box cannot be read automatically, so this uses
// Google's own question suggestions for the keyword (what / why / how / which / can / is ...), which are the same kind of questions.
const Q_PREFIX = ['what is', 'how to', 'which', 'why', 'can', 'is', 'are'];
export async function paaQuestions(kw, fetchFn = suggestGoogle) {
  const seen = new Set(), out = [];
  for (const p of Q_PREFIX) {
    for (const s of (await fetchFn(`${p} ${kw}`)).slice(0, 4)) {
      const q = String(s).toLowerCase().trim();
      if (q.length < 12 || q.length > 90 || seen.has(q) || !q.includes(kw.split(' ')[0])) continue;
      seen.add(q); out.push(q);
    }
  }
  return out.slice(0, 8);
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// The research team's hand-over to the writer: one topic, the question it answers, a title, the keywords and the questions to answer.
export function buildBrief({ kw, questions = [], related = [], why = '', competitors = [] }) {
  const q = questions.find((x) => /^(what|how|which|why)\b/.test(x)) || questions[0] || '';
  const year = new Date().getFullYear();
  let title = q ? cap(q.replace(/\?$/, '')) : `Best ${kw} for Women in India`;
  if (title.length > 62) title = `${cap(kw)}: Complete Guide ${year}`.slice(0, 62);
  if (!title.toLowerCase().includes(kw.toLowerCase())) title = `${cap(kw)}: ${title}`.slice(0, 66);
  const keywords = [kw, ...related.filter((r) => r !== kw)].slice(0, 6);
  return { topic: kw, question: q || `What should shoppers know about ${kw}?`, title, keywords, questions: questions.slice(0, 6), why, competitors: competitors.slice(0, 3) };
}
export async function researchBrief(env, kw, why) {
  const qs = [...new Set([...(await paaQuestions(kw)), ...(await env.DB.prepare("SELECT kw FROM keywords WHERE intent='question' AND kw LIKE ? ORDER BY score DESC LIMIT 5").bind('%' + kw.split(' ')[0] + '%').all()).results.map((r) => r.kw)])];
  const first = kw.split(' ')[0];
  const related = (await env.DB.prepare("SELECT kw FROM keywords WHERE intent!='question' AND kw LIKE ? AND kw!=? ORDER BY score DESC LIMIT 5").bind('%' + first + '%', kw).all()).results.map((r) => r.kw);
  const comp = (await env.DB.prepare("SELECT title FROM intel WHERE kind='competitor' AND LOWER(title) LIKE ? ORDER BY id DESC LIMIT 3").bind('%' + first.toLowerCase() + '%').all()).results.map((r) => r.title);
  return buildBrief({ kw, questions: qs, related, why, competitors: comp });
}
export async function planTopics(env, n = 2) {
  await ensureAgentTables(env);
  const pending = (await env.DB.prepare("SELECT COUNT(*) n FROM topic_queue WHERE status='pending'").first()).n;
  if (pending >= 4) return { queued: 0, pending };
  const cands = (await env.DB.prepare(`SELECT k.kw, k.score, m.volume, m.competition, m.impressions FROM keywords k LEFT JOIN keyword_metrics m ON m.kw=k.kw
    WHERE k.covered=0 AND k.status='new' AND k.kw NOT IN (SELECT kw FROM topic_queue) ORDER BY k.score DESC LIMIT 400`).all()).results;
  const titles = (await env.DB.prepare("SELECT LOWER(title) t FROM intel WHERE kind='competitor' AND seen_at > datetime('now','-45 days')").all()).results.map((r) => r.t);
  for (const c of cands) c.competitor = titles.some((t) => c.kw.split(' ').filter((w) => w.length > 3).every((w) => t.includes(w.replace(/s$/, ''))));
  const picks = pickTopics(cands, Math.min(n, 4 - pending));
  for (const p of picks) { const brief = await researchBrief(env, p.kw, p.why); p.brief = brief; await env.DB.prepare('INSERT INTO topic_queue (kw,why,brief) VALUES (?,?,?)').bind(p.kw, p.why, JSON.stringify(brief)).run(); }
  return { queued: picks.length, pending: pending + picks.length, picks };
}

// ---------- reading the outside world (public feeds only) ----------
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; WinkCasaBot/1.0; +https://www.winkcasa.com)', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' };
async function getFeed(url) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) }); if (!r.ok) return []; return parseFeed(await r.text()); } catch { return []; }
}
async function keep(env, kind, source, items) {
  const fresh = [];
  for (const it of items.slice(0, 25)) {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO intel (kind,source,title,url,published) VALUES (?,?,?,?,?)').bind(kind, source, it.title, it.url, it.published).run();
    if (r.meta && r.meta.changes) fresh.push(it);
  }
  return fresh;
}
const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
// Closest rivals: Indian fashion / artificial / demi-fine jewellery and accessories sold online. Editable in Admin > Agent.
export const DEFAULT_COMPETITORS = ['yellowchimes.com', 'priyaasi.com', 'sukkhi.com', 'voylla.com', 'zariin.com', 'palmonas.com', 'giva.co', 'jewelmaze.com'];
const RIVAL_NEWS = '(Palmonas OR Giva OR Sukkhi OR Voylla OR Zariin OR "Yellow Chimes" OR Priyaasi OR Jewelmaze) jewellery';
export async function getCompetitors(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='competitors'").first();
  try { const a = JSON.parse(row.value); if (Array.isArray(a) && a.length) return a; } catch {}
  return DEFAULT_COMPETITORS;
}
export async function setCompetitors(env, list) {
  const clean = [...new Set(list.map((s) => String(s).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()).filter((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)))].slice(0, 8);
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('competitors',?)").bind(JSON.stringify(clean)).run();
  return clean;
}
export async function marketWatch(env) {
  await ensureAgentTables(env);
  const out = { comp: [], compNews: [], news: [] };
  out.compNews = await keep(env, 'competitor-news', 'Google News', await getFeed(gnews(RIVAL_NEWS)));
  for (const q of ['fashion jewellery trend India', 'hair accessories trend India']) out.news.push(...await keep(env, 'news', 'Google News', await getFeed(gnews(q))));
  for (const d of (await getCompetitors(env)).slice(0, 8)) {
    let items = [];
    for (const path of ['/blogs/news.atom', '/blog/feed', '/feed']) { items = await getFeed(`https://${d}${path}`); if (items.length) break; }
    out.comp.push(...await keep(env, 'competitor', d, items.map((i) => ({ ...i, title: d + ': ' + i.title }))));
  }
  return out;
}
const THEMES = [['Gifting and festive', /\b(gift|gifting|diwali|rakhi|raksha|valentine|wedding|festive|festival|karwa|bridal|birthday|anniversary|christmas)\b/i], ['Styling guides', /\b(style|styling|how to wear|wear|outfit|look|ideas|pair|match)\b/i], ['Care and cleaning', /\b(clean|care|polish|tarnish|maintain|store|allerg|sensitive)\b/i], ['Trends', /\b(trend|trending|2026|2027|latest|new collection|collection)\b/i], ['Offers', /\b(sale|offer|discount|deal|off\b|combo)\b/i]];
// What rivals write about, grouped. Shows the owner where their content effort goes.
export function themeDigest(titles) {
  const c = new Map();
  for (const t of titles) for (const [name, re] of THEMES) if (re.test(t)) { c.set(name, (c.get(name) || 0) + 1); break; }
  return THEMES.map(([name]) => ({ theme: name, count: c.get(name) || 0 })).filter((x) => x.count).sort((a, b) => b.count - a.count);
}
export async function listenSocial(env) {
  await ensureAgentTables(env);
  const found = [];
  for (const q of ['oxidised earrings india', 'where to buy jewellery online india', 'claw clip hair india']) {
    found.push(...await keep(env, 'reddit', 'Reddit', await getFeed(`https://www.reddit.com/search.rss?q=${encodeURIComponent(q)}&sort=new&t=week`)));
  }
  return found;
}
export async function recentIntel(env, n = 40) {
  await ensureAgentTables(env);
  return (await env.DB.prepare('SELECT kind,source,title,url,seen_at FROM intel ORDER BY id DESC LIMIT ?').bind(n).all()).results;
}
