import { json, safeEqual } from './lib.js';
import { clientIp, countHits, addHit, tooMany } from './guard.js';

// Wrong tokens are counted per IP: 10 misses in 15 minutes locks that IP out, even with the right token.
export async function requireAdmin(request, env) {
  const key = 'adminfail:' + clientIp(request);
  try { if ((await countHits(env, key, 900)) >= 10) return tooMany('Too many attempts. Try again in 15 minutes.'); } catch {}
  const auth = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || !safeEqual(auth, 'Bearer ' + env.ADMIN_TOKEN)) {
    try { await addHit(env, key); } catch {}
    return json({ error: 'Unauthorized.' }, 401);
  }
  return null;
}

export const FULFILMENT = ['new', 'ordered', 'shipped', 'delivered', 'cancelled', 'returned'];

export function parseRow(r) {
  const { items_json, ...rest } = r;
  let items = [];
  try { items = JSON.parse(items_json); } catch {}
  return { ...rest, items };
}

// Razorpay fee estimate: 2% + 18% GST on the fee.
export const feePaise = (total) => Math.round(total * 0.02 * 1.18);

// Reduce tracked stock once, when an order becomes paid.
export async function applyStock(env, orderRef) {
  const row = await env.DB.prepare('SELECT items_json FROM orders WHERE order_ref=?').bind(orderRef).first();
  if (!row) return;
  let items = []; try { items = JSON.parse(row.items_json); } catch {}
  for (const l of items) {
    const r = await env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id=? AND stock IS NOT NULL AND stock >= ?').bind(l.qty, l.id, l.qty).run();
    if (r.meta?.changes) continue;
    const p = await env.DB.prepare('SELECT stock FROM products WHERE id=?').bind(l.id).first();
    if (p && p.stock !== null) { // not enough left: never go negative, and tell the owner so the customer can be refunded or told
      await env.DB.prepare('UPDATE products SET stock = 0 WHERE id=?').bind(l.id).run();
      await env.DB.prepare('INSERT INTO order_events (order_ref, text) VALUES (?, ?)').bind(orderRef, `OVERSOLD: customer ordered ${l.qty} of "${l.name || l.id}" but only ${p.stock} were left. Refund or arrange more stock.`).run();
    }
  }
}
