import { json } from '../../src/lib.js';
import { cjTick } from '../../src/cj-auto.js';

// Called by the daily GitHub schedule (and by site visits). It takes no input, only publishes the next
// products from the CJ queue, never more than the daily number, and only between day 1 and day 30.
export async function onRequest({ env }) {
  if (!env.DB) return json({ ok: false }, 500);
  return json(await cjTick(env));
}
