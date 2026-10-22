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

const arr = (v, n, f) => (Array.isArray(v) ? v : []).map(f).filter(Boolean).slice(0, n);
const httpsUrl = (u) => { u = s(u, 500); return /^https:\/\/[^\s]+$/.test(u) ? u : ''; };
const SCHEMAS = ['BlogPosting', 'Article', 'NewsArticle', 'TechArticle'];
const when = (v) => { const t = s(v, 25).replace('T', ' '); return /^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(t) ? t.slice(0, 19).padEnd(19, ':00') : ''; };

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const title = s(b.title, 120);
  if (title.length < 3) return json({ error: 'Enter a title.' }, 400);
  if (!okImg(b.image) || !okImg(b.og_image)) return json({ error: 'Images must be uploaded here or be an https link.' }, 400);
  const pub = b.published ? 1 : 0;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const v = {
    title, excerpt: s(b.excerpt, 300), body: s(b.body, 40000), image: s(b.image, 600) || null, author: s(b.author, 60) || 'WinkCasa Team', published: pub,
    seo_title: s(b.seo_title, 90) || null, seo_description: s(b.seo_description, 200) || null,
    focus_kw: s(b.focus_kw, 100) || null, extra_kw: s(b.extra_kw, 200) || null, canonical: httpsUrl(b.canonical) || null,
    noindex: b.noindex ? 1 : 0, nofollow: b.nofollow ? 1 : 0, noarchive: b.noarchive ? 1 : 0,
    og_title: s(b.og_title, 100) || null, og_desc: s(b.og_desc, 220) || null, og_image: s(b.og_image, 600) || null,
    tw_card: b.tw_card === 'summary' ? 'summary' : b.tw_card === 'summary_large_image' ? 'summary_large_image' : null, tw_title: s(b.tw_title, 100) || null, tw_desc: s(b.tw_desc, 220) || null,
    schema_type: SCHEMAS.includes(b.schema_type) ? b.schema_type : 'BlogPosting',
    faq_json: JSON.stringify(arr(b.faq, 10, (f) => { const q = s(f?.q, 200), a = s(f?.a, 900); return q && a ? { q, a } : null; })),
    steps_json: JSON.stringify(arr(b.steps, 12, (f) => { const n = s(f?.name, 120), t = s(f?.text, 700); return n && t ? { name: n, text: t } : null; })),
    tldr: s(b.tldr, 500) || null,
    takeaways_json: JSON.stringify(arr(b.takeaways, 8, (t) => s(t, 220) || null)),
    sources_json: JSON.stringify(arr(b.sources, 10, (f) => { const t = s(f?.title, 160), u = httpsUrl(f?.url); return t && u ? { title: t, url: u } : null; })),
    category: s(b.category, 60) || null, tags: s(b.tags, 200) || null, img_alt: s(b.img_alt, 160) || null,
    author_bio: s(b.author_bio, 400) || null, author_url: httpsUrl(b.author_url) || null, crumb_title: s(b.crumb_title, 60) || null,
  };
  const cols = Object.keys(v);

  if (b.id) {
    const old = await env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(Number(b.id)).first();
    if (!old) return json({ error: 'Post not found.' }, 404);
    let slug = slugify(b.slug || old.slug);
    const clash = await env.DB.prepare('SELECT id FROM posts WHERE slug=? AND id<>?').bind(slug, old.id).first();
    if (clash) slug += '-' + old.id;
    const given = when(b.published_at), keep = old.published_at && old.published_at <= now ? old.published_at : '';
    const pa = pub ? (given || keep || now) : (given || old.published_at);
    await env.DB.prepare(`UPDATE posts SET ${cols.map((c) => c + '=?').join(',')},slug=?,published_at=?,updated_at=datetime('now') WHERE id=?`)
      .bind(...cols.map((c) => v[c]), slug, pa, old.id).run();
    return json({ ok: true, id: old.id, slug });
  }
  let slug = slugify(b.slug || title);
  if (await env.DB.prepare('SELECT id FROM posts WHERE slug=?').bind(slug).first()) slug += '-' + Date.now().toString(36).slice(-4);
  const pa = pub ? (when(b.published_at) || now) : (when(b.published_at) || null);
  const r = await env.DB.prepare(`INSERT INTO posts (${cols.join(',')},slug,published_at) VALUES (${cols.map(() => '?').join(',')},?,?)`)
    .bind(...cols.map((c) => v[c]), slug, pa).run();
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
