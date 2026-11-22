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

test('market watch stores news + competitor posts once, flags brand mentions, ignores blocked sources', async () => {
  stub({ 'news.google.com': rss(['WinkCasa launches festive range', 'Fashion jewellery trend 2026']), 'giva.co': rss(['Giva: layering guide']), 'palmonas.com': { body: 'blocked', status: 403 } });
  const r = await runAgent(env, { only: 'market_watch', force: true });
  assert.equal(r.ran[0].error, undefined);
  const n1 = env.DB.raw.prepare('SELECT COUNT(*) n FROM intel').get().n; assert.ok(n1 >= 3);
  await runAgent(env, { only: 'market_watch', force: true });
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM intel').get().n, n1, 'same items are not stored twice');
  assert.ok(env.DB.raw.prepare("SELECT 1 FROM intel WHERE kind='brand'").get(), 'brand mention kept');
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
  assert.deepEqual(q.map((x) => x.kw), ['oxidised earrings']);
  assert.match(q[0].why, /10,?000/);
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
