import { json } from '../../src/lib.js';
import { submitIndexNow } from '../../src/indexnow.js';
import { cronGuard } from '../../src/guard.js';

export async function onRequestGet({ request, env }) {
  const g = await cronGuard(request, env, 'indexnow', 6 * 3600); if (g) return g;
  return new Response(JSON.stringify(await submitIndexNow(env)), { headers: { 'Content-Type': 'application/json' } });
}
