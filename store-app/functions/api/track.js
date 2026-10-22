import { json } from '../../src/lib.js';

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

// POST { ref, phone } -> status of that order (the phone number must match the one used at checkout).
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const ref = String(b.ref || '').trim().toUpperCase().slice(0, 20), phone = last10(b.phone);
  if (!ref || phone.length < 10) return json({ error: 'Enter your order number and mobile number.' }, 400);
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_ref=?').bind(ref).first();
  if (!o || last10(o.phone) !== phone) return json({ error: 'We could not find an order with those details.' }, 404);
  let items = []; try { items = JSON.parse(o.items_json); } catch {}
  return json({
    ref: o.order_ref, name: o.customer_name.split(' ')[0], placedAt: o.created_at, paidAt: o.paid_at, paid: o.status === 'paid',
    status: o.fulfilment_status, deliveryMinAt: o.delivery_min_at, deliveryMaxAt: o.delivery_max_at,
    courier: o.courier, tracking: o.tracking_number, shippedAt: o.shipped_at, deliveredAt: o.delivered_at,
    refund: o.refund_status, total: o.total_paise, items: items.map((i) => ({ name: i.name, qty: i.qty })), city: o.city, pincode: o.pincode,
  });
}
