import { json, safeEqual } from '../../../src/lib.js';

// Your order list. Send header:  Authorization: Bearer <ADMIN_TOKEN>
export async function onRequestGet({ request, env }) {
  const auth = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || !safeEqual(auth, 'Bearer ' + env.ADMIN_TOKEN)) {
    return json({ error: 'Unauthorized.' }, 401);
  }
  const status = new URL(request.url).searchParams.get('status');
  const stmt = status
    ? env.DB.prepare('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 200').bind(status)
    : env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200');
  const { results } = await stmt.all();
  return json(results.map((r) => ({ ...r, items: JSON.parse(r.items_json), items_json: undefined })));
}
