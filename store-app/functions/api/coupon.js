import { activeProducts, getSettings } from '../../src/store.js';
import { json, priceCart } from '../../src/lib.js';
import { resolveCoupon } from '../../src/coupons.js';

// Public: checks a discount code (or finds the automatic offer) for the shopper's cart. Prices come from the server.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Not available.' }, 503);
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const priced = priceCart({ products: rows.map((r) => ({ id: r.id, name: r.name, price: r.price })), config: { freeShippingAbove: S.shipping.freeShippingAbove, shipping: S.shipping.charge } }, b.items);
  if (priced.error) return json({ error: priced.error }, 400);
  const r = await resolveCoupon(env, b.code, priced.subtotal, priced.shipping, String(b.email || '').slice(0, 120));
  if (r.error) return json({ error: r.error }, 400);
  return json({ ...r, subtotal: priced.subtotal, shipping: priced.shipping - (r.shippingOff || 0), total: priced.subtotal - (r.discount || 0) + priced.shipping - (r.shippingOff || 0) });
}
