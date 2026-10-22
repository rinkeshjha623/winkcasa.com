import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';

// POST { data: "data:image/jpeg;base64,...." } -> { url: "/img/<id>" }
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
  if (!m) return json({ error: 'Use a JPG, PNG or WebP image.' }, 400);
  if (m[2].length > 1_400_000) return json({ error: 'Image is too large. Try a smaller photo.' }, 413);
  const id = crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare('INSERT INTO images (id, mime, data) VALUES (?,?,?)').bind(id, m[1], m[2]).run();
  return json({ url: '/img/' + id });
}
