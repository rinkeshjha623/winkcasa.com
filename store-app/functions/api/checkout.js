import { activeProducts, getSettings, deliveryWindow } from '../../src/store.js';
import { json, priceCart, cleanCustomer } from '../../src/lib.js';
import { getCustomer } from '../../src/auth.js';
import { resolveCoupon } from '../../src/coupons.js';

export async function onRequestPost({ request, env }) {
  const keyId = env.RAZORPAY_KEY_ID || env.key_id;
  const keySecret = env.RAZORPAY_KEY_SECRET || env.key_secret;
  if (!keyId || !keySecret || !env.DB) {
    const missing = [!keyId && 'key id', !keySecret && 'key secret', !env.DB && 'database'].filter(Boolean).join(', ');
    return json({ error: 'Checkout is not set up yet.', missing }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const [rows, settings] = await Promise.all([activeProducts(env), getSettings(env)]);
  if (!settings.store.open) return json({ error: settings.store.closedMessage }, 503);
  const catalog = {
    products: rows.map((r) => ({ id: r.id, name: r.name, price: r.price, stock: r.stock })),
    config: { freeShippingAbove: settings.shipping.freeShippingAbove, shipping: settings.shipping.charge },
  };
  const priced = priceCart(catalog, body.items);
  if (priced.error) return json({ error: priced.error }, 400);
  for (const l of priced.lines) {
    const p = catalog.products.find((x) => x.id === l.id);
    if (p.stock !== null && p.stock < l.qty) {
      return json({ error: p.stock > 0 ? `Only ${p.stock} of "${p.name}" left.` : `"${p.name}" is sold out.` }, 409);
    }
  }
  const cust = cleanCustomer(body.customer);
  if (cust.error) return json({ error: cust.error }, 400);

  let discount = 0, shipOff = 0, couponCode = null;
  const cp = await resolveCoupon(env, body.coupon, priced.subtotal, priced.shipping, cust.value.email);
  if (cp.error) return json({ error: cp.error }, 400);
  if (cp.ok && !cp.none) { discount = cp.discount; shipOff = cp.shippingOff; couponCode = cp.code; }
  priced.discount = discount; priced.shipping -= shipOff; priced.total = priced.subtotal - discount + priced.shipping;

  // Cash on delivery: a COD fee is added to the total, and only the advance is charged online now.
  const cod = settings.cod, wantCod = body.mode === 'cod' && cod.enabled;
  const codFee = wantCod ? cod.fee * 100 : 0;
  priced.total += codFee;
  const advance = wantCod ? Math.min(Math.max(cod.advance * 100, 100), priced.total - 100) : 0;
  const payNow = wantCod ? advance : priced.total;

  const orderRef = 'WC-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

  const rz = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(keyId + ':' + keySecret),
    },
    body: JSON.stringify({ amount: payNow, currency: 'INR', receipt: orderRef }),
  });
  if (!rz.ok) return json({ error: 'Could not start payment. Please try again.' }, 502);
  const rzOrder = await rz.json();

  const me = await getCustomer(request, env).catch(() => null);
  const now = new Date(), win = deliveryWindow(now);
  const placedAt = now.toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.prepare(
    `INSERT INTO orders (order_ref, razorpay_order_id, status, subtotal_paise, shipping_paise, total_paise,
       customer_name, phone, email, address, city, state, pincode, items_json, created_at, delivery_min_at, delivery_max_at, customer_id, discount_paise, coupon_code, pay_mode, cod_fee_paise, cod_advance_paise)
     VALUES (?, ?, 'created', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    orderRef, rzOrder.id, priced.subtotal, priced.shipping, priced.total,
    cust.value.name, cust.value.phone, cust.value.email, cust.value.address,
    cust.value.city, cust.value.state, cust.value.pincode, JSON.stringify(priced.lines), placedAt, win.min, win.max, me ? me.id : null, discount, couponCode, wantCod ? 'cod' : 'online', codFee, advance
  ).run();
  if (wantCod) await env.DB.prepare('INSERT INTO order_events (order_ref, text) VALUES (?, ?)').bind(orderRef, `CASH ON DELIVERY order. Advance Rs ${advance / 100} is paid online. Collect Rs ${(priced.total - advance) / 100} in cash at delivery (includes Rs ${codFee / 100} COD fee). The advance is kept if the customer refuses delivery.`).run();

  return json({ orderRef, razorpayOrderId: rzOrder.id, amount: payNow, orderTotal: priced.total, mode: wantCod ? 'cod' : 'online', keyId, placedAt, deliveryMinAt: win.min, deliveryMaxAt: win.max });
}
