import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';

// Admin-only: list, view and delete the selfies customers chose to save.
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  const u = new URL(request.url), id = Number(u.searchParams.get('id'));
  if (id) {
    const r = await env.DB.prepare('SELECT image FROM selfies WHERE id=?').bind(id).first();
    if (!r) return json({ error: 'Not found.' }, 404);
    return json({ image: r.image });
  }
  const { results } = await env.DB.prepare(`SELECT s.id, s.face_shape, s.created_at, s.customer_id, c.name, c.email FROM selfies s LEFT JOIN customers c ON c.id=s.customer_id ORDER BY s.id DESC LIMIT 200`).all();
  const total = (await env.DB.prepare('SELECT COUNT(*) n FROM selfies').first()).n;
  return json({ list: results, total });
}
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.action === 'delete') { await env.DB.prepare('DELETE FROM selfies WHERE id=?').bind(Number(b.id)).run(); return json({ ok: true }); }
  if (b.action === 'delete_all') { await env.DB.prepare('DELETE FROM selfies').run(); return json({ ok: true }); }
  return json({ error: 'Unknown action.' }, 400);
}
