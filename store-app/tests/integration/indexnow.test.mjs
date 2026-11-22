import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDB } from '../helpers/d1.mjs';
import { submitIndexNow } from '../../src/indexnow.js';

const realFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = realFetch; });
const calls = [];
let plan = () => 200;
globalThis.fetch = async (u, o) => { const body = o && o.body ? JSON.parse(o.body) : null; calls.push({ url: String(u), body }); const s = plan(String(u), calls.length); return new Response('', { status: s, headers: s === 429 ? { 'retry-after': '3600' } : {} }); };
const newEnv = () => ({ DB: makeDB() });
const HOUR = 3600000;
const setState = (env, patch) => env.DB.raw.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('indexnow',?)").run(JSON.stringify(patch));
const getState = (env) => JSON.parse(env.DB.raw.prepare("SELECT value FROM settings WHERE key='indexnow'").get().value);

test('first run sends everything once, to the shared IndexNow endpoint first', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 202;
  const r = await submitIndexNow(env);
  assert.equal(r.ok, true); assert.ok(r.submitted > 50);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.indexnow\.org\/indexnow/);
  assert.equal(calls[0].body.host, 'www.winkcasa.com');
  assert.ok(calls[0].body.urlList.length === r.submitted);
});
test('a second call the same day does not call the search engine again', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 200;
  await submitIndexNow(env); const n = calls.length;
  const r2 = await submitIndexNow(env);
  assert.equal(calls.length, n); assert.equal(r2.ok, true); assert.equal(r2.skipped, true);
});
test('the next day only NEW urls are sent; nothing new means no call', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 200;
  await submitIndexNow(env);
  const st = getState(env); st.okAt -= 25 * HOUR; setState(env, st);
  calls.length = 0;
  const r = await submitIndexNow(env);
  assert.equal(calls.length, 0); assert.equal(r.skipped, true); assert.match(r.reason, /nothing new/i);
  // remove one remembered url: it counts as new again
  const st2 = getState(env); const gone = st2.sent.pop(); st2.okAt -= 25 * HOUR; setState(env, st2);
  calls.length = 0; await submitIndexNow(env);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0].body.urlList.map((u) => u.replace('https://www.winkcasa.com', '')), [gone]);
});
test('once a week everything is re-sent', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 200;
  await submitIndexNow(env);
  const st = getState(env); st.okAt -= 25 * HOUR; st.fullAt -= 8 * 24 * HOUR; setState(env, st);
  calls.length = 0; const r = await submitIndexNow(env);
  assert.equal(calls.length, 1); assert.ok(r.submitted > 50);
});
test('a 429 on the first endpoint falls back to Bing', async () => {
  const env = newEnv(); calls.length = 0; plan = (u) => (u.includes('api.indexnow.org') ? 429 : 200);
  const r = await submitIndexNow(env);
  assert.equal(r.ok, true); assert.equal(calls.length, 2); assert.match(calls[1].url, /bing\.com\/indexnow/);
});
test('429 on every endpoint: backs off for 24 hours and stops asking', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 429;
  const r = await submitIndexNow(env);
  assert.equal(r.ok, false); assert.equal(r.status, 429);
  const st = getState(env); assert.ok(st.backoffUntil > Date.now() + 20 * HOUR);
  calls.length = 0; const r2 = await submitIndexNow(env);
  assert.equal(calls.length, 0); assert.equal(r2.ok, true); assert.equal(r2.skipped, true); assert.match(r2.reason, /rate limit/i);
});
test('a normal failure is retried after 6 hours, not sooner, and is never remembered as sent', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 500;
  assert.equal((await submitIndexNow(env)).ok, false);
  const st = getState(env); assert.ok(!st.sent || st.sent.length === 0); assert.ok(!st.ok);
  calls.length = 0; plan = () => 200;
  assert.equal((await submitIndexNow(env)).skipped, true); assert.equal(calls.length, 0);
  st.failAt -= 7 * HOUR; setState(env, st);
  const r = await submitIndexNow(env); assert.equal(r.ok, true); assert.ok(calls.length >= 1);
});
test('force (the owner pressing Run) bypasses the waiting but still sends only what the rules allow', async () => {
  const env = newEnv(); calls.length = 0; plan = () => 200;
  await submitIndexNow(env); calls.length = 0;
  const r = await submitIndexNow(env, { force: true });
  assert.equal(r.ok, true); assert.equal(calls.length, 0); // nothing new, so still no call
  assert.match(r.reason, /nothing new/i);
});

test('the search engine\'s reply text is kept so the owner can see why it refused', async () => {
  const env = newEnv(); calls.length = 0;
  globalThis.fetch = async (u) => new Response('Too many requests for host www.winkcasa.com', { status: 429 });
  const r = await submitIndexNow(env);
  assert.equal(r.ok, false); assert.match(r.detail, /Too many requests for host/);
  assert.match(getState(env).detail, /Too many requests/);
});
test('three endpoints are tried: IndexNow, Bing, Yandex', async () => {
  const env = newEnv(); const seen = [];
  globalThis.fetch = async (u) => { seen.push(String(u)); return new Response('', { status: 503 }); };
  await submitIndexNow(env);
  assert.equal(seen.length, 3); assert.match(seen[2], /yandex\.com\/indexnow/);
});
