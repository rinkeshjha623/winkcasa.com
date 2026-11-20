// Discount codes and automatic offers. All maths happens on the server in paise.
import { normEmail } from './guard.js';
const COUNTED = "(status NOT IN ('created','cancelled') OR (status='created' AND created_at > datetime('now','-30 minutes')))";
const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

function evaluate(c, subtotal, shipping) {
  let off = 0, freeShip = false;
  if (c.type === 'percent') {
    off = Math.floor(subtotal * Math.min(100, c.value) / 100);
    if (c.max_discount) off = Math.min(off, c.max_discount * 100);
  } else if (c.type === 'fixed') off = Math.min(c.value * 100, subtotal);
  else if (c.type === 'freeship') freeShip = shipping > 0;
  off = Math.min(off, Math.max(0, subtotal - 100));            // never let an order fall below ₹1
  return { discount: off, shippingOff: freeShip ? shipping : 0 };
}

export const labelOf = (c) => c.type === 'percent' ? `${c.value}% off` : c.type === 'fixed' ? `₹${c.value} off` : 'Free delivery';

async function check(env, c, subtotal, email, phone) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (!c || !c.active) return 'That code is not valid.';
  if (c.starts_at && c.starts_at > now) return 'That offer has not started yet.';
  if (c.ends_at && c.ends_at < now) return 'That offer has ended.';
  if (subtotal < c.min_order * 100) return `Add ₹${(c.min_order - Math.floor(subtotal / 100)).toLocaleString('en-IN')} more to use this offer (minimum ₹${c.min_order.toLocaleString('en-IN')}).`;
  if (c.usage_limit) {
    const n = (await env.DB.prepare(`SELECT COUNT(*) n FROM orders WHERE coupon_code=? AND ${COUNTED}`).bind(c.code).first()).n;
    if (n >= c.usage_limit) return 'This offer has been fully claimed.';
  }
  if (c.once_per_customer && (email || phone)) {
    const { results } = await env.DB.prepare(`SELECT email, phone FROM orders WHERE coupon_code=? AND ${COUNTED}`).bind(c.code).all();
    const me = normEmail(email), ph = last10(phone);
    if (results.some((o) => (me && normEmail(o.email) === me) || (ph.length === 10 && last10(o.phone) === ph))) return 'This code can be used once per customer.';
  }
  return '';
}

// code '' => best automatic offer. Returns { ok, code, label, discount, shippingOff } or { error }.
export async function resolveCoupon(env, code, subtotal, shipping, email, phone) {
  code = String(code || '').trim().toUpperCase().slice(0, 30);
  if (code) {
    const c = await env.DB.prepare('SELECT * FROM coupons WHERE code=?').bind(code).first();
    const err = c ? await check(env, c, subtotal, email, phone) : 'That code is not valid.';
    if (err) return { error: err };
    const r = evaluate(c, subtotal, shipping);
    if (!r.discount && !r.shippingOff) return { error: 'This code does not apply to your order.' };
    return { ok: true, code: c.code, label: labelOf(c), ...r };
  }
  const { results } = await env.DB.prepare('SELECT * FROM coupons WHERE auto_apply=1 AND active=1').all();
  let best = null;
  for (const c of results) {
    if (await check(env, c, subtotal, email, phone)) continue;
    const r = evaluate(c, subtotal, shipping), v = r.discount + r.shippingOff;
    if (v > 0 && (!best || v > best.v)) best = { v, c, r };
  }
  return best ? { ok: true, auto: true, code: best.c.code, label: labelOf(best.c), ...best.r } : { ok: true, none: true, discount: 0, shippingOff: 0 };
}

// Called right after an order is saved: with simultaneous checkouts, only the first `usage_limit` orders keep the code.
export async function withinCouponLimit(env, code, orderRef) {
  const c = await env.DB.prepare('SELECT usage_limit FROM coupons WHERE code=?').bind(code).first();
  if (!c || !c.usage_limit) return true;
  const { results } = await env.DB.prepare(`SELECT order_ref FROM orders WHERE coupon_code=? AND ${COUNTED} ORDER BY id LIMIT ?`).bind(code, c.usage_limit).all();
  return results.some((r) => r.order_ref === orderRef);
}
