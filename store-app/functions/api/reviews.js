import { json } from '../../src/lib.js';
import { ensureReviews, cleanReview, canReview } from '../../src/reviews.js';

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

// POST { ref, phone, product_id, rating, text, name } -> a verified-buyer review (order must be paid and delivered, item must be in it).
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const ref = String(b.ref || '').trim().toUpperCase().slice(0, 20), phone = last10(b.phone), pid = Number(b.product_id);
  const rv = cleanReview(b); if (rv.error) return json({ error: rv.error }, 400);
  if (!ref || phone.length < 10 || !pid) return json({ error: 'Missing order details.' }, 400);
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_ref=?').bind(ref).first();
  if (!o || last10(o.phone) !== phone) return json({ error: 'We could not find an order with those details.' }, 404);
  const ok = canReview(o, pid); if (ok.error) return json({ error: ok.error }, 403);
  await ensureReviews(env);
  const dup = await env.DB.prepare('SELECT id FROM reviews WHERE order_ref=? AND product_id=?').bind(ref, pid).first();
  if (dup) return json({ error: 'You have already reviewed this item. Thank you!' }, 409);
  await env.DB.prepare("INSERT INTO reviews (product_id, order_ref, name, rating, text, verified, source, status) VALUES (?,?,?,?,?,1,'buyer','approved')")
    .bind(pid, ref, rv.name === 'WinkCasa customer' ? o.customer_name.split(' ')[0] : rv.name, rv.rating, rv.text || null).run();
  return json({ ok: true });
}
