import { json, hmacHex, safeEqual } from '../../src/lib.js';

// Called by the browser right after Razorpay reports a successful payment.
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!oid || !pid || !sig) return json({ error: 'Missing payment details.' }, 400);

  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET || env.key_secret, oid + '|' + pid);
  if (!safeEqual(expected, sig)) return json({ error: 'Payment could not be verified.' }, 400);

  await env.DB.prepare(
    `UPDATE orders SET status='paid', payment_id=?, paid_at=datetime('now')
     WHERE razorpay_order_id=? AND status='created'`
  ).bind(pid, oid).run();

  const row = await env.DB.prepare('SELECT order_ref FROM orders WHERE razorpay_order_id=?').bind(oid).first();
  return json({ ok: true, orderRef: row?.order_ref });
}
