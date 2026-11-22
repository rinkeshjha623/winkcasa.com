import test from 'node:test';
import assert from 'node:assert/strict';
import { claude } from '../../src/writer.js';

const realFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = realFetch; });
const reply = (text) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
const gone = () => new Response(JSON.stringify({ error: { message: 'This model models/x is no longer available to new users.' } }), { status: 404 });

test('Gemini: tries the current model first, then falls back when a model is retired', async () => {
  const tried = [];
  globalThis.fetch = async (u) => { const m = /models\/([^:]+):/.exec(String(u))[1]; tried.push(m); return m === 'gemini-3.8-flash' ? reply('hello') : gone(); };
  assert.equal(await claude({ GEMINI_API_KEY: 'k' }, { system: 's', prompt: 'p' }), 'hello');
  assert.equal(tried[0], 'gemini-3.8-flash');
});
test('Gemini: a retired first model falls through to the next one', async () => {
  const tried = [];
  globalThis.fetch = async (u) => { const m = /models\/([^:]+):/.exec(String(u))[1]; tried.push(m); return m === 'gemini-flash-latest' ? reply('ok') : gone(); };
  assert.equal(await claude({ GEMINI_API_KEY: 'k' }, { system: 's', prompt: 'p' }), 'ok');
  assert.deepEqual(tried, ['gemini-3.8-flash', 'gemini-flash-latest']);
});
test('Gemini: an owner-chosen GEMINI_MODEL is tried first', async () => {
  const tried = [];
  globalThis.fetch = async (u) => { tried.push(/models\/([^:]+):/.exec(String(u))[1]); return reply('x'); };
  await claude({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'my-model' }, { system: 's', prompt: 'p' });
  assert.deepEqual(tried, ['my-model']);
});
test('Gemini: real errors (bad key, quota) are reported, not retried on other models', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; return new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 }); };
  await assert.rejects(() => claude({ GEMINI_API_KEY: 'bad' }, { system: 's', prompt: 'p' }), /API key not valid/);
  assert.equal(n, 1);
});
