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
