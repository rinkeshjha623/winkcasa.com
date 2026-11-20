import { json } from '../../src/lib.js';
import { cjTick } from '../../src/cj-auto.js';
import { cronGuard } from '../../src/guard.js';

// Called by the daily GitHub schedule (and by site visits). It takes no input, only publishes the next
// products from the CJ queue, never more than the daily number, and only between day 1 and day 30.
export async function onRequest({ request, env }) {
  if (!env.DB) return json({ ok: false }, 500);
  const g = await cronGuard(request, env, 'cjdaily', 10); if (g) return g;
  return json(await cjTick(env));
}
