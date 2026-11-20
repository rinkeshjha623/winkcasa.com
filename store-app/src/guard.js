// Abuse protection: per-IP rate limits, email normalising, and safe scheduler (cron) calls.
import { json, safeEqual } from './lib.js';

export const clientIp = (request) =>
  request.headers.get('CF-Connecting-IP') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

// jo.hn+deal@Gmail.com and john@gmail.com are the same person.
export function normEmail(e) {
  let [l, d] = String(e || '').trim().toLowerCase().split('@');
  if (!d) return String(e || '').trim().toLowerCase();
  l = l.split('+')[0];
  if (d === 'gmail.com' || d === 'googlemail.com') { l = l.replace(/\./g, ''); d = 'gmail.com'; }
  return l + '@' + d;
}

const HITS_SQL = 'CREATE TABLE IF NOT EXISTS rate_hits (k TEXT NOT NULL, at INTEGER NOT NULL)';
const HITS_IDX = 'CREATE INDEX IF NOT EXISTS idx_rate_hits ON rate_hits(k, at)';
let ready = false;
async function ensure(env) { if (ready) return; await env.DB.prepare(HITS_SQL).run(); await env.DB.prepare(HITS_IDX).run(); ready = true; }
const nowS = () => Math.floor(Date.now() / 1000);

export async function countHits(env, key, windowSec) {
  await ensure(env);
  return (await env.DB.prepare('SELECT COUNT(*) n FROM rate_hits WHERE k=? AND at>?').bind(key, nowS() - windowSec).first()).n;
}
export async function addHit(env, key) {
  await ensure(env);
  await env.DB.prepare('INSERT INTO rate_hits (k, at) VALUES (?, ?)').bind(key, nowS()).run();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM rate_hits WHERE at<?').bind(nowS() - 86400).run();
}
export const tooMany = (msg = 'Too many requests. Please wait a little and try again.') =>
  new Response(JSON.stringify({ error: msg }), { status: 429, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '300' } });

// Counts this call and returns a 429 response when the IP is over the limit for this bucket, else null. Never blocks the shop if the counter itself fails.
export async function rateLimit(env, request, bucket, limit, windowSec, msg) {
  try {
    const key = bucket + ':' + clientIp(request);
    if ((await countHits(env, key, windowSec)) >= limit) return tooMany(msg);
    await addHit(env, key);
  } catch {}
  return null;
}

// Schedulers: if CRON_SECRET is set it must be sent as "Authorization: Bearer <secret>". Calls closer together than minGapSec are skipped.
export async function cronGuard(request, env, name, minGapSec) {
  if (env.CRON_SECRET) {
    const a = request.headers.get('authorization') || '';
    if (!safeEqual(a, 'Bearer ' + env.CRON_SECRET)) return json({ error: 'Unauthorized.' }, 401);
  }
  try {
    const k = 'cron_last_' + name, last = await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(k).first();
    if (last && nowS() - Number(last.value) < minGapSec) return json({ ok: true, skipped: true });
    await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(k, String(nowS())).run();
  } catch {}
  return null;
}
