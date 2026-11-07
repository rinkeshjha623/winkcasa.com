// Visual expert's graphics: real product photos placed inside the WinkCasa brand frame (logo band, gold border), made on Cloudflare's image service.
// Needs "Image transformations" switched on for the domain (Cloudflare dashboard > Images > Transformations). Without it the photo comes back unchanged and we say so.
import { SITE_ORIGIN, absUrl } from './social.js';
import { renderText } from './pngtext.js';

export const KINDS = { social: { w: 1080, h: 1350, frame: '/brand/frame_1080x1350.png' }, blog: { w: 1200, h: 630, frame: '/brand/frame_1200x630.png' } };
export function dims(b) {
  const u = new Uint8Array(b);
  if (u[0] === 0x89 && u[1] === 0x50) return { w: (u[16] << 24) | (u[17] << 16) | (u[18] << 8) | u[19], h: (u[20] << 24) | (u[21] << 16) | (u[22] << 8) | u[23], mime: 'image/png' };
  if (u[0] === 0xff && u[1] === 0xd8) { let i = 2; while (i < u.length - 9) { if (u[i] !== 0xff) { i++; continue; } const m = u[i + 1]; if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: (u[i + 5] << 8) | u[i + 6], w: (u[i + 7] << 8) | u[i + 8], mime: 'image/jpeg' }; i += 2 + ((u[i + 2] << 8) | u[i + 3]); } }
  if (u[0] === 0x52 && u[1] === 0x49 && u[8] === 0x57 && u[12] === 0x56 && u[15] === 0x20) return { w: (u[26] | (u[27] << 8)) & 0x3fff, h: (u[28] | (u[29] << 8)) & 0x3fff, mime: 'image/webp' };
  return null;
}
export const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };

// Returns "/img/<id>" of a branded JPG made from the photo at `src`.
export async function makeGraphic(env, src, kind = 'social') {
  const K = KINDS[kind];
  const r = await fetch(absUrl(src), { cf: { image: { width: K.w, height: K.h, fit: 'pad', background: '#0B1916', quality: 86, format: 'jpeg', draw: [{ url: SITE_ORIGIN + K.frame, left: 0, top: 0 }] } } });
  if (!r.ok) throw new Error('could not load the photo (' + r.status + ')');
  const buf = await r.arrayBuffer(), d = dims(buf);
  if (!d || d.w !== K.w || d.h !== K.h) throw new Error('Cloudflare image transformations are not switched on for the domain yet (Cloudflare dashboard > Images > Transformations > enable for winkcasa.com)');
  if (buf.byteLength > 1_000_000) throw new Error('graphic too large');
  const id = crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare('INSERT INTO images (id, mime, data) VALUES (?,?,?)').bind(id, 'image/jpeg', b64(buf)).run();
  return '/img/' + id;
}

// Best real product photo for a piece of text (title, keyword, caption).
export async function productFor(env, text) {
  const toks = new Set(String(text).toLowerCase().replace(/[^a-z ]/g, ' ').split(' ').filter((t) => t.length > 3 && !/^(women|womens|girls|with|that|this|from|your|best|how|what|guide|online|india|style|wear|every)$/.test(t)).map((t) => t.replace(/s$/, '')));
  const rows = (await env.DB.prepare("SELECT id,name,category,images_json FROM products WHERE active=1 AND noindex=0 AND (stock IS NULL OR stock>0) AND images_json NOT IN ('[]','') ORDER BY id DESC LIMIT 400").all()).results;
  let best = null, bs = -1;
  for (const p of rows) { const w = (p.name + ' ' + p.category).toLowerCase().replace(/[^a-z ]/g, ' ').split(' ').map((t) => t.replace(/s$/, '')); const s = w.filter((t) => toks.has(t)).length; if (s > bs) { bs = s; best = p; } }
  if (!best) return null;
  let imgs = []; try { imgs = JSON.parse(best.images_json) || []; } catch {}
  const url = imgs.find((u) => typeof u === 'string' && u); return url ? { ...best, url } : null;
}

// Blog posts with no cover: make one from a matching real product photo.
export async function blogCovers(env, n = 2) {
  const rows = (await env.DB.prepare("SELECT id,title,focus_kw,category FROM posts WHERE image IS NULL OR image='' ORDER BY published DESC, id DESC LIMIT ?").bind(n).all()).results;
  const made = [], fails = [];
  for (const p of rows) {
    try {
      const prod = await productFor(env, `${p.focus_kw || ''} ${p.title} ${p.category || ''}`); if (!prod) { fails.push(`${p.title}: no product photo to use`); continue; }
      const url = await makeGraphic(env, prod.url, 'blog');
      await env.DB.prepare("UPDATE posts SET image=?, og_image=CASE WHEN og_image IS NULL OR og_image='' THEN ? ELSE og_image END, img_alt=CASE WHEN img_alt IS NULL OR img_alt='' THEN ? ELSE img_alt END WHERE id=?").bind(url, url, p.title.slice(0, 120), p.id).run();
      made.push(`${p.title} <- ${prod.name.slice(0, 40)}`);
    } catch (e) { fails.push(`${p.title}: ${e.message}`); if (/not switched on/.test(e.message)) break; }
  }
  return { made, fails };
}

// Auto social posts with no picture at all: give them one.
export async function socialNoMedia(env, n = 3) {
  const rows = (await env.DB.prepare("SELECT id,title,caption FROM social_posts WHERE stage IS NULL AND status IN ('draft','scheduled') AND (media_json='[]' OR media_json='') ORDER BY id LIMIT ?").bind(n).all()).results;
  const made = [], fails = [];
  for (const p of rows) {
    try { const prod = await productFor(env, p.title + ' ' + p.caption); if (!prod) { fails.push(p.title + ': no product photo'); continue; }
      const url = await makeGraphic(env, prod.url, 'social');
      await env.DB.prepare('UPDATE social_posts SET media_json=? WHERE id=?').bind(JSON.stringify([{ url, type: 'image' }]), p.id).run(); made.push(p.title);
    } catch (e) { fails.push(`${p.title}: ${e.message}`); if (/not switched on/.test(e.message)) break; }
  }
  return { made, fails };
}

// ---------- v2: graphics with text (headline / product name and price) ----------
const GOLDC = [201, 164, 92], IVC = [243, 235, 221];
async function tempImage(env, bytes, mime) { const id = crypto.randomUUID().replace(/-/g, ''); await env.DB.prepare('INSERT INTO images (id, mime, data) VALUES (?,?,?)').bind(id, mime, b64(bytes)).run(); return id; }
const dropTemp = (env, ids) => Promise.all(ids.map((id) => env.DB.prepare('DELETE FROM images WHERE id=?').bind(id).run().catch(() => {})));
async function finish(env, r, w, h) {
  if (!r.ok) throw new Error('image service error ' + r.status);
  const buf = await r.arrayBuffer(), d = dims(buf);
  if (!d || d.w !== w || d.h !== h) throw new Error('Cloudflare image transformations are not switched on for the domain yet (Cloudflare dashboard > Images > Transformations > enable for winkcasa.com)');
  if (buf.byteLength > 1_000_000) throw new Error('graphic too large');
  return '/img/' + (await tempImage(env, buf, 'image/jpeg'));
}

// Social 1080x1350: real photo in the brand frame, with line1 (product name or headline) and line2 in the bottom band.
export async function makeSocialText(env, src, { line1, line2 }) {
  const txt = await renderText(1080, 135, [
    ...(line2 ? [{ text: line1, font: 'med', color: IVC, x: 48, y: 22, maxW: 984, maxLines: 1, align: 'center' }, { text: line2, font: 'cap', color: GOLDC, x: 48, y: 78, maxW: 984, maxLines: 1, align: 'center', spacing: 1 }]
      : [{ text: line1, font: 'med', color: IVC, x: 48, y: 20, maxW: 984, maxLines: 2, align: 'center' }]),
  ]);
  const tid = await tempImage(env, txt, 'image/png');
  try {
    const r = await fetch(absUrl(src), { cf: { image: { width: 1080, height: 1350, fit: 'pad', background: '#0B1916', quality: 86, format: 'jpeg', draw: [{ url: SITE_ORIGIN + '/brand/frame_social2.png', left: 0, top: 0 }, { url: SITE_ORIGIN + '/img/' + tid, left: 0, top: 1215 }] } } });
    return await finish(env, r, 1080, 1350);
  } finally { await dropTemp(env, [tid]); }
}

// Blog cover 1200x630: headline panel on the left, real photo on the right, logo plate.
export async function makeBlogCover(env, src, { title, label }) {
  const long = title.length > 62, font = long ? 'bold2' : 'bold';
  const txt = await renderText(600, 630, [
    { text: String(label || 'WinkCasa blog').toUpperCase(), font: 'cap', color: GOLDC, x: 56, y: 92, maxW: 490, maxLines: 1, spacing: 3 },
    { text: title, font, color: IVC, x: 56, y: 136, maxW: 490, maxLines: long ? 5 : 4 },
  ]);
  const pr = await fetch(absUrl(src), { cf: { image: { width: 600, height: 630, fit: 'cover', gravity: 'auto', quality: 88, format: 'jpeg' } } });
  if (!pr.ok) throw new Error('could not load the photo (' + pr.status + ')');
  const pbuf = await pr.arrayBuffer(), pd = dims(pbuf);
  if (!pd || pd.w !== 600 || pd.h !== 630) throw new Error('Cloudflare image transformations are not switched on for the domain yet (Cloudflare dashboard > Images > Transformations > enable for winkcasa.com)');
  const tid = await tempImage(env, txt, 'image/png'), pid = await tempImage(env, pbuf, 'image/jpeg');
  try {
    const r = await fetch(SITE_ORIGIN + '/brand/bg_blog.png', { cf: { image: { width: 1200, height: 630, fit: 'scale-down', quality: 88, format: 'jpeg', draw: [{ url: SITE_ORIGIN + '/img/' + pid, left: 600, top: 0 }, { url: SITE_ORIGIN + '/img/' + tid, left: 0, top: 0 }, { url: SITE_ORIGIN + '/brand/frame_blog2.png', left: 0, top: 0 }] } } });
    return await finish(env, r, 1200, 630);
  } finally { await dropTemp(env, [tid, pid]); }
}

const plain = (t) => String(t || '').replace(/^(blog|story|reel|post|carousel)\s*:\s*/i, '').trim();
const catLabel = (p) => (p.category && String(p.category).trim()) || (/guide|how to|best|style|wear/i.test(p.title) ? 'Style guide' : 'WinkCasa blog');

// Every blog post whose cover is missing or is a plain text card gets a real-photo cover. Two per run.
export async function upgradeBlogCovers(env, n = 2) {
  const rows = (await env.DB.prepare("SELECT id,title,focus_kw,category,image,og_image FROM posts WHERE image IS NULL OR image='' OR image LIKE '/articles/%' ORDER BY published DESC, id DESC LIMIT ?").bind(n).all()).results;
  const made = [], fails = [];
  for (const p of rows) {
    try {
      const prod = await productFor(env, `${p.focus_kw || ''} ${p.title} ${p.category || ''}`); if (!prod) { fails.push(`${p.title}: no product photo to use`); continue; }
      const url = await makeBlogCover(env, prod.url, { title: p.title, label: catLabel(p) });
      await env.DB.prepare("UPDATE posts SET image=?, og_image=CASE WHEN og_image IS NULL OR og_image='' OR og_image=? THEN ? ELSE og_image END, img_alt=CASE WHEN img_alt IS NULL OR img_alt='' THEN ? ELSE img_alt END WHERE id=?").bind(url, p.image || '', url, p.title.slice(0, 120), p.id).run();
      made.push(`${p.title} <- ${prod.name.slice(0, 40)}`);
    } catch (e) { fails.push(`${p.title}: ${e.message}`); if (/not switched on/.test(e.message)) break; }
  }
  return { made, fails };
}

// Planned social posts (30-day plan, hand-made) whose first picture is a plain text card or missing: put a real photo under the logo with the headline.
export async function upgradeSocialCards(env, n = 2) {
  const rows = (await env.DB.prepare("SELECT id,title,caption,media_json,format FROM social_posts WHERE stage IS NULL AND status IN ('scheduled','draft') AND format IN ('post','carousel') AND (media_json='[]' OR media_json LIKE '[{\"url\":\"/social/m/%') AND scheduled_at > datetime('now') ORDER BY scheduled_at LIMIT ?").bind(n).all()).results;
  const made = [], fails = [];
  for (const p of rows) {
    try {
      let med = []; try { med = JSON.parse(p.media_json) || []; } catch {}
      const prod = await productFor(env, p.title + ' ' + p.caption); if (!prod) { fails.push(`${p.title}: no product photo`); continue; }
      const head = plain(p.title) || prod.name.slice(0, 80);
      const url = await makeSocialText(env, prod.url, { line1: head, line2: 'WWW.WINKCASA.COM · FREE DELIVERY ABOVE ₹999' });
      await env.DB.prepare('UPDATE social_posts SET media_json=? WHERE id=?').bind(JSON.stringify([{ url, type: 'image' }, ...med.slice(1)]), p.id).run(); made.push(head);
    } catch (e) { fails.push(`${p.title}: ${e.message}`); if (/not switched on/.test(e.message)) break; }
  }
  return { made, fails };
}
