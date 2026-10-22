import { json, hmacHex, safeEqual } from '../../src/lib.js';
import { applyStock } from '../../src/admin.js';

// Razorpay webhook: marks orders paid even if the customer closes the tab before verify runs.
// Add this URL in Razorpay Dashboard > Webhooks, event "payment.captured", with the same secret
// stored as RAZORPAY_WEBHOOK_SECRET.
export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const sig = request.headers.get('x-razorpay-signature') || '';
  if (!env.RAZORPAY_WEBHOOK_SECRET) return json({ error: 'Not configured.' }, 503);
  const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
  if (!safeEqual(expected, sig)) return json({ error: 'Bad signature.' }, 400);

  const evt = JSON.parse(raw);
  if (evt.event === 'payment.captured') {
    const p = evt.payload.payment.entity;
    const res = await env.DB.prepare(
      `UPDATE orders SET status='paid', payment_id=?, paid_at=datetime('now')
       WHERE razorpay_order_id=? AND status='created'`
    ).bind(p.id, p.order_id).run();
    if (res.meta?.changes) {
      const o = await env.DB.prepare('SELECT order_ref FROM orders WHERE razorpay_order_id=?').bind(p.order_id).first();
      if (o) await applyStock(env, o.order_ref);
      await env.DB.prepare(
        "INSERT INTO order_events (order_ref, text) SELECT order_ref, ? FROM orders WHERE razorpay_order_id=?"
      ).bind('Payment received (' + p.id + ')', p.order_id).run();
    }
  }
  return json({ ok: true });
}
