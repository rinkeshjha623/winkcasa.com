import catalog from '../../public/products.json';
import { json, priceCart, cleanCustomer } from '../../src/lib.js';

export async function onRequestPost({ request, env }) {
  const keyId = env.RAZORPAY_KEY_ID || env.key_id;
  const keySecret = env.RAZORPAY_KEY_SECRET || env.key_secret;
  if (!keyId || !keySecret || !env.DB) {
    return json({ error: 'Checkout is not set up yet.' }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const priced = priceCart(catalog, body.items);
  if (priced.error) return json({ error: priced.error }, 400);
  const cust = cleanCustomer(body.customer);
  if (cust.error) return json({ error: cust.error }, 400);

  const orderRef = 'WC-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

  const rz = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(keyId + ':' + keySecret),
    },
    body: JSON.stringify({ amount: priced.total, currency: 'INR', receipt: orderRef }),
  });
  if (!rz.ok) return json({ error: 'Could not start payment. Please try again.' }, 502);
  const rzOrder = await rz.json();

  await env.DB.prepare(
    `INSERT INTO orders (order_ref, razorpay_order_id, status, subtotal_paise, shipping_paise, total_paise,
       customer_name, phone, email, address, city, state, pincode, items_json)
     VALUES (?, ?, 'created', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    orderRef, rzOrder.id, priced.subtotal, priced.shipping, priced.total,
    cust.value.name, cust.value.phone, cust.value.email, cust.value.address,
    cust.value.city, cust.value.state, cust.value.pincode, JSON.stringify(priced.lines)
  ).run();

  return json({ orderRef, razorpayOrderId: rzOrder.id, amount: priced.total, keyId });
}
