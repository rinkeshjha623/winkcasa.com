import { submitIndexNow } from '../../src/indexnow.js';
export async function onRequestGet({ env }) {
  return new Response(JSON.stringify(await submitIndexNow(env)), { headers: { 'Content-Type': 'application/json' } });
}
