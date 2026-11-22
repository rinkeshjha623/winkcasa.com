import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDB } from '../helpers/d1.mjs';
import { runAgent, SKILLS, reviewPost } from '../../src/agent.js';
import * as adminAgent from '../../functions/api/admin/agent.js';

const env = { DB: makeDB(), ADMIN_TOKEN: 'adm' };
const adm = { authorization: 'Bearer adm' };
const rss = (items) => `<rss><channel>${items.map((t, i) => `<item><title>${t}</title><link>https://news.example/${encodeURIComponent(t)}</link></item>`).join('')}</channel></rss>`;
const realFetch = globalThis.fetch;
const stub = (map) => { globalThis.fetch = async (u) => { const url = String(u); for (const [k, v] of Object.entries(map)) if (url.includes(k)) return new Response(v.body ?? v, { status: v.status || 200 }); return new Response('nope', { status: 404 }); }; };
test.after(() => { globalThis.fetch = realFetch; });

test('new agents are registered, on by default, and have a definition', () => {
  for (const id of ['market_watch', 'social_listening', 'insights', 'topic_planner']) assert.ok(SKILLS.find((s) => s.id === id), id);
});

test('market watch tracks competitors (blogs + their news), not WinkCasa; stores each item once; skips blocked sites', async () => {
  stub({ 'news.google.com': rss(['Palmonas opens new store', 'Fashion jewellery trend 2026']), 'giva.co': rss(['Giva: layering guide for Diwali']), 'palmonas.com': { body: 'blocked', status: 403 } });
  const seen = []; const orig = globalThis.fetch; globalThis.fetch = async (u, o) => { seen.push(String(u)); return orig(u, o); };
  const r = await runAgent(env, { only: 'market_watch', force: true });
  assert.equal(r.ran[0].error, undefined);
  assert.ok(!seen.some((u) => /winkcasa/i.test(decodeURIComponent(u)) && u.includes('news.google')), 'no WinkCasa brand search');
  const n1 = env.DB.raw.prepare('SELECT COUNT(*) n FROM intel').get().n; assert.ok(n1 >= 3);
  assert.ok(env.DB.raw.prepare("SELECT 1 FROM intel WHERE kind='competitor' AND title LIKE 'giva.co:%'").get(), 'competitor blog post kept');
  assert.ok(env.DB.raw.prepare("SELECT 1 FROM intel WHERE kind='competitor-news'").get(), 'competitor news kept');
  await runAgent(env, { only: 'market_watch', force: true });
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM intel').get().n, n1, 'same items are not stored twice');
  globalThis.fetch = orig;
});
test('default competitor list covers the real fashion-jewellery rivals and is editable', async () => {
  const { getCompetitors, setCompetitors } = await import('../../src/intel.js');
  const d = await getCompetitors(env);
  for (const x of ['yellowchimes.com', 'priyaasi.com', 'sukkhi.com', 'voylla.com', 'zariin.com', 'palmonas.com', 'giva.co']) assert.ok(d.includes(x), x);
  assert.deepEqual(await setCompetitors(env, ['https://www.Example.com/blog', 'bad host']), ['www.example.com']);
  await setCompetitors(env, d);
});
test('social listening reads public Reddit search feed and never throws when blocked', async () => {
  stub({ 'reddit.com': rss(['Where to buy oxidised earrings in India?']) });
  await runAgent(env, { only: 'social_listening', force: true });
  assert.ok(env.DB.raw.prepare("SELECT 1 FROM intel WHERE kind='reddit'").get());
  stub({ 'reddit.com': { body: 'blocked', status: 429 } });
  const r = await runAgent(env, { only: 'social_listening', force: true });
  assert.equal(r.ran[0].error, undefined);
});

test('topic planner queues topics using imported Keyword Planner data; the writer reads the queue first', async () => {
  const ins = env.DB.raw.prepare("INSERT OR REPLACE INTO keywords (kw,category,intent,score,sources,covered,status) VALUES (?,?,?,?,?,0,'new')");
  ins.run('oxidised earrings', 'earrings', 'buy', 30, 'google'); ins.run('jhumka', 'earrings', 'buy', 90, 'google');
  const csv = 'Keyword,Avg. monthly searches,Competition\noxidised earrings,10K – 100K,Low\njhumka,100K – 1M,High\n';
  const up = await adminAgent.onRequestPost({ env, request: new Request('https://x/api/admin/agent', { method: 'POST', headers: { 'content-type': 'application/json', ...adm }, body: JSON.stringify({ action: 'kwimport', csv }) }) });
  assert.equal((await up.json()).imported, 2);
  await runAgent(env, { only: 'topic_planner', force: true });
  const q = env.DB.raw.prepare("SELECT kw,why FROM topic_queue WHERE status='pending' ORDER BY id").all();
  assert.deepEqual(q.map((x) => x.kw), ['jhumka', 'oxidised earrings']);
  assert.match(q[0].why, /At least 1,00,000/);
  const brief = JSON.parse(env.DB.raw.prepare("SELECT brief FROM topic_queue WHERE kw='oxidised earrings'").get().brief);
  assert.equal(brief.topic, 'oxidised earrings'); assert.ok(brief.title.toLowerCase().includes('oxidised earrings')); assert.ok(brief.keywords.length >= 1); assert.ok(brief.question);
});

test('admin API returns the playbook, definitions and recent market intel; rejects anonymous', async () => {
  const bad = await adminAgent.onRequestGet({ env, request: new Request('https://x/api/admin/agent') });
  assert.equal(bad.status, 401);
  const r = await adminAgent.onRequestGet({ env, request: new Request('https://x/api/admin/agent', { headers: adm }) });
  const j = await r.json();
  assert.ok(j.playbook.length >= 8); assert.ok(j.defs.market_watch.role); assert.ok(Array.isArray(j.intel)); assert.ok(j.intel.length > 0);
  assert.ok(j.setup && 'ga4' in j.setup && 'gsc' in j.setup && 'bing' in j.setup && 'keywordPlanner' in j.setup);
});

test('insights without credentials explains exactly what to add instead of failing', async () => {
  const r = await runAgent(env, { only: 'insights', force: true });
  assert.equal(r.ran[0].error, undefined);
  const log = env.DB.raw.prepare("SELECT title,detail FROM agent_log WHERE skill='insights' ORDER BY id DESC LIMIT 1").get();
  assert.match(log.detail, /GOOGLE_SA_JSON|BING_WEBMASTER_KEY|GA4_PROPERTY_ID/);
});

test('final review now blocks a post that fails the SEO checklist and lists why', () => {
  const p = { title: 'Pretty Ear Jewellery Ideas Everyone Loves', excerpt: 'x'.repeat(100), focus_kw: 'oxidised earrings', slug: 'a', body: '## a\n## b\n## c\n' + 'word '.repeat(700) + '[x](/c/earrings)' };
  const probs = reviewPost(p);
  assert.ok(probs.some((x) => /focus keyword|title/.test(x)));
});

// Cloudflare allows only 50 database + network calls per request on the free plan. "Run everything now" must stay under it.
const counting = (db) => { let n = 0; const wrap = (st) => ({ bind: (...a) => wrap(st.bind(...a)), run: () => { n++; return st.run(); }, first: () => { n++; return st.first(); }, all: () => { n++; return st.all(); }, _inner: st });
  return { raw: db.raw, prepare: (s) => wrap(db.prepare(s)), batch: async (list) => { n++; return db.batch(list.map((x) => x._inner || x)); }, exec: (s) => db.exec(s), get count() { return n; }, reset() { n = 0; } }; };
test('one agent run (even "run everything now") stays under 45 database + network calls', async () => {
  const many = (host) => `<rss><channel>${Array.from({ length: 25 }, (_, i) => `<item><title>${host} post ${i} oxidised earrings</title><link>https://${host}/p${i}</link></item>`).join('')}</channel></rss>`;
  const cdb = counting(makeDB()); const e2 = { DB: cdb, ADMIN_TOKEN: 'adm' };
  let fetches = 0;
  globalThis.fetch = async (u) => { fetches++; const host = new URL(String(u)).hostname; return new Response(many(host + Math.random()), { status: 200 }); };
  for (let i = 0; i < 3; i++) { // pressing the button repeatedly must eventually cover everything, each press within the limit
    cdb.reset(); fetches = 0;
    await runAgent(e2, { force: true });
    assert.ok(cdb.count + fetches <= 49, `press ${i + 1}: ${cdb.count} db + ${fetches} network = ${cdb.count + fetches}`);
  }
  for (const id of ['market_watch', 'topic_planner', 'insights']) {
    cdb.reset(); fetches = 0; await runAgent(e2, { only: id, force: true });
    assert.ok(cdb.count + fetches <= 49, `${id} alone: ${cdb.count} db + ${fetches} network`);
  }
});
