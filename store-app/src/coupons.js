// Discount codes and automatic offers. All maths happens on the server in paise.
const COUNTED = "status NOT IN ('created','cancelled')";

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

async function check(env, c, subtotal, email) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (!c || !c.active) return 'That code is not valid.';
  if (c.starts_at && c.starts_at > now) return 'That offer has not started yet.';
  if (c.ends_at && c.ends_at < now) return 'That offer has ended.';
  if (subtotal < c.min_order * 100) return `Add ₹${(c.min_order - Math.floor(subtotal / 100)).toLocaleString('en-IN')} more to use this offer (minimum ₹${c.min_order.toLocaleString('en-IN')}).`;
  if (c.usage_limit) {
    const n = (await env.DB.prepare(`SELECT COUNT(*) n FROM orders WHERE coupon_code=? AND ${COUNTED}`).bind(c.code).first()).n;
    if (n >= c.usage_limit) return 'This offer has been fully claimed.';
  }
  if (c.once_per_customer && email) {
    const n = (await env.DB.prepare(`SELECT COUNT(*) n FROM orders WHERE coupon_code=? AND lower(email)=lower(?) AND ${COUNTED}`).bind(c.code, email).first()).n;
    if (n) return 'This code can be used once per customer.';
  }
  return '';
}

// code '' => best automatic offer. Returns { ok, code, label, discount, shippingOff } or { error }.
export async function resolveCoupon(env, code, subtotal, shipping, email) {
  code = String(code || '').trim().toUpperCase().slice(0, 30);
  if (code) {
    const c = await env.DB.prepare('SELECT * FROM coupons WHERE code=?').bind(code).first();
    const err = c ? await check(env, c, subtotal, email) : 'That code is not valid.';
    if (err) return { error: err };
    const r = evaluate(c, subtotal, shipping);
    if (!r.discount && !r.shippingOff) return { error: 'This code does not apply to your order.' };
    return { ok: true, code: c.code, label: labelOf(c), ...r };
  }
  const { results } = await env.DB.prepare('SELECT * FROM coupons WHERE auto_apply=1 AND active=1').all();
  let best = null;
  for (const c of results) {
    if (await check(env, c, subtotal, email)) continue;
    const r = evaluate(c, subtotal, shipping), v = r.discount + r.shippingOff;
    if (v > 0 && (!best || v > best.v)) best = { v, c, r };
  }
  return best ? { ok: true, auto: true, code: best.c.code, label: labelOf(best.c), ...best.r } : { ok: true, none: true, discount: 0, shippingOff: 0 };
}
