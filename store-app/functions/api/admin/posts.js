import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { slugify } from '../../../src/store.js';
import { ensurePosts } from '../../../src/blog.js';

const s = (v, n) => String(v ?? '').trim().slice(0, n);
const okImg = (u) => !u || (/^(https:\/\/|\/img\/)/.test(u) && u.length <= 600);

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  await ensurePosts(env);
  const { results } = await env.DB.prepare('SELECT * FROM posts ORDER BY COALESCE(published_at, created_at) DESC, id DESC').all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const title = s(b.title, 120);
  if (title.length < 3) return json({ error: 'Enter a title.' }, 400);
  if (!okImg(b.image)) return json({ error: 'Image must be uploaded here or be an https link.' }, 400);
  const pub = b.published ? 1 : 0;
  const f = [title, s(b.excerpt, 300), s(b.body, 20000), s(b.image, 600) || null, s(b.author, 60) || 'WinkCasa Team', pub, s(b.seo_title, 70) || null, s(b.seo_description, 170) || null];

  if (b.id) {
    const old = await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(Number(b.id)).first();
    if (!old) return json({ error: 'Post not found.' }, 404);
    let slug = slugify(b.slug || old.slug);
    const clash = await env.DB.prepare('SELECT id FROM posts WHERE slug=? AND id<>?').bind(slug, old.id).first();
    if (clash) slug += '-' + old.id;
    const when = pub && !old.published_at ? new Date().toISOString().slice(0, 19).replace('T', ' ') : old.published_at;
    await env.DB.prepare("UPDATE posts SET title=?,excerpt=?,body=?,image=?,author=?,published=?,seo_title=?,seo_description=?,slug=?,published_at=?,updated_at=datetime('now') WHERE id=?")
      .bind(...f, slug, when, old.id).run();
    return json({ ok: true, id: old.id, slug });
  }
  let slug = slugify(b.slug || title);
  if (await env.DB.prepare('SELECT id FROM posts WHERE slug=?').bind(slug).first()) slug += '-' + Date.now().toString(36).slice(-4);
  const when = pub ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
  const r = await env.DB.prepare('INSERT INTO posts (title,excerpt,body,image,author,published,seo_title,seo_description,slug,published_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(...f, slug, when).run();
  return json({ ok: true, id: r.meta.last_row_id, slug });
}

export async function onRequestDelete({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return json({ error: 'Missing id.' }, 400);
  await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
  return json({ ok: true });
}
