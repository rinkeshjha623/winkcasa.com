import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  const { results } = await env.DB.prepare('SELECT c.*, p.title post_title, p.slug post_slug FROM comments c LEFT JOIN posts p ON p.id=c.post_id ORDER BY (c.status=\'pending\') DESC, c.id DESC LIMIT 300').all();
  const on = await env.DB.prepare("SELECT value FROM settings WHERE key='comments_on'").first();
  return json({ list: results, enabled: !!on && on.value === '1' });
}
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const id = Number(b.id);
  if (b.action === 'toggle') { await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('comments_on',?)").bind(b.enabled ? '1' : '0').run(); return json({ ok: true }); }
  if (!id) return json({ error: 'Missing id.' }, 400);
  if (b.action === 'approve') await env.DB.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(id).run();
  else if (b.action === 'spam') await env.DB.prepare("UPDATE comments SET status='spam' WHERE id=?").bind(id).run();
  else if (b.action === 'delete') await env.DB.prepare('DELETE FROM comments WHERE id=?').bind(id).run();
  else if (b.action === 'reply') await env.DB.prepare("UPDATE comments SET reply=?, status='approved' WHERE id=?").bind(String(b.reply || '').trim().slice(0, 1000) || null, id).run();
  else return json({ error: 'Unknown action.' }, 400);
  return json({ ok: true });
}
