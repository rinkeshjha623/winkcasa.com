import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const { results } = await env.DB.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 300').all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!['new', 'done'].includes(b.status)) return json({ error: 'Invalid status.' }, 400);
  await env.DB.prepare('UPDATE messages SET status=? WHERE id=?').bind(b.status, Number(b.id)).run();
  return json({ ok: true });
}
