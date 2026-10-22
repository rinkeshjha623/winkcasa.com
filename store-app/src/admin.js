import { json, safeEqual } from './lib.js';

export function requireAdmin(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || !safeEqual(auth, 'Bearer ' + env.ADMIN_TOKEN)) {
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
    await env.DB.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id=? AND stock IS NOT NULL').bind(l.qty, l.id).run();
  }
}
