import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { ensureReviews, cleanReview } from '../../../src/reviews.js';
import { activeProducts } from '../../../src/store.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  await ensureReviews(env);
  const [{ results }, prods] = await Promise.all([
    env.DB.prepare('SELECT * FROM reviews ORDER BY id DESC LIMIT 300').all(), activeProducts(env)]);
  const names = Object.fromEntries(prods.map((p) => [p.id, p.name]));
  return json({ list: results.map((r) => ({ ...r, product: names[r.product_id] || '#' + r.product_id })), products: prods.map((p) => ({ id: p.id, name: p.name })) });
}

// There is deliberately no action that sets a rating or a count. The numbers are always worked out from the reviews stored here.
export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  await ensureReviews(env);
  const id = Number(b.id), run = (sql, ...a) => env.DB.prepare(sql).bind(...a).run();
  if (b.action === 'add') {
    const rv = cleanReview(b); if (rv.error) return json({ error: rv.error }, 400);
    const note = String(b.source_note || '').trim().slice(0, 300);
    if (!Number(b.product_id)) return json({ error: 'Choose a product.' }, 400);
    if (note.length < 5) return json({ error: 'Say where this review came from (for example: WhatsApp message, 18 Nov, screenshot saved).' }, 400);
    if (!String(b.name || '').trim()) return json({ error: "Enter the customer's name." }, 400);
    await run("INSERT INTO reviews (product_id, name, rating, text, verified, source, source_note, status) VALUES (?,?,?,?,0,'manual',?,'approved')", Number(b.product_id), rv.name, rv.rating, rv.text || null, note);
    return json({ ok: true });
  }
  if (!id) return json({ error: 'Missing id.' }, 400);
  if (b.action === 'hide') await run("UPDATE reviews SET status='hidden' WHERE id=?", id);
  else if (b.action === 'show') await run("UPDATE reviews SET status='approved' WHERE id=?", id);
  else if (b.action === 'pin') await run('UPDATE reviews SET pinned=1 WHERE id=?', id);
  else if (b.action === 'unpin') await run('UPDATE reviews SET pinned=0 WHERE id=?', id);
  else if (b.action === 'reply') await run('UPDATE reviews SET reply=? WHERE id=?', String(b.reply || '').trim().slice(0, 600) || null, id);
  else if (b.action === 'delete') await run('DELETE FROM reviews WHERE id=?', id);
  else return json({ error: 'Unknown action.' }, 400);
  return json({ ok: true });
}
