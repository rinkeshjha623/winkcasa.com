// Social publishing: Instagram + Facebook Page through the Meta Graph API.
// Connection details live in D1 (social_kv 'meta') and are never sent back to the browser in full.
import { PLAN } from './social-plan.js';
export const SITE_ORIGIN = 'https://www.winkcasa.com';
const G = 'https://graph.facebook.com/v21.0';
export const FORMATS = ['post', 'carousel', 'reel', 'story'];
export const PLATFORMS = ['instagram', 'facebook'];
const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export async function kvGet(env, k, d) { const r = await env.DB.prepare('SELECT v FROM social_kv WHERE k=?').bind(k).first(); try { return r ? JSON.parse(r.v) : d; } catch { return d; } }
export async function kvSet(env, k, v) { await env.DB.prepare('INSERT INTO social_kv (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(k, JSON.stringify(v)).run(); }

async function graph(path, params, token, method = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === 'GET' ? `${G}/${path}?${body}` : `${G}/${path}`;
  const r = await fetch(url, method === 'GET' ? {} : { method, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error ? `${j.error.message}${j.error.error_user_msg ? ' ' + j.error.error_user_msg : ''}` : 'Meta API error ' + r.status);
  return j;
}

export const absUrl = (u) => (/^https?:\/\//.test(u) ? u : SITE_ORIGIN + (u.startsWith('/') ? u : '/' + u));
export const mediaOf = (p) => { try { return JSON.parse(p.media_json).filter((m) => m && m.url).map((m) => ({ url: absUrl(m.url), type: m.type === 'video' ? 'video' : 'image' })); } catch { return []; } };

export async function connectionInfo(env) {
  const c = await kvGet(env, 'meta', null);
  return c && c.token ? { connected: true, page_id: c.page_id || '', ig_id: c.ig_id || '', page_name: c.page_name || '', ig_username: c.ig_username || '', token_tail: c.token.slice(-4) } : { connected: false };
}

// Paste any Facebook user/page token: find the Page, its own long-lived Page token and the linked Instagram account.
export async function connect(env, token) {
  token = String(token || '').trim(); if (token.length < 30) throw new Error('Paste the full access token.');
  let page;
  try { const r = await graph('me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '25' }, token, 'GET'); page = (r.data || [])[0]; if (!page) throw new Error('No Facebook Page found for this token.'); }
  catch (e) {
    // a Page token cannot list accounts: read the page itself
    const me = await graph('me', { fields: 'id,name,instagram_business_account{id,username}' }, token, 'GET').catch(() => { throw e; });
    page = { ...me, access_token: token };
  }
  const conn = { token: page.access_token || token, page_id: page.id, page_name: page.name, ig_id: page.instagram_business_account?.id || '', ig_username: page.instagram_business_account?.username || '' };
  await kvSet(env, 'meta', conn);
  return conn;
}

async function fbPublish(conn, p, media) {
  const t = conn.token, pg = conn.page_id, cap = p.caption;
  if (p.format === 'story') {
    const m = media[0]; if (!m || m.type !== 'image') throw new Error('Facebook Stories from here need one image.');
    const ph = await graph(`${pg}/photos`, { url: m.url, published: 'false' }, t);
    const s = await graph(`${pg}/photo_stories`, { photo_id: ph.id }, t); return s.post_id || s.id || 'story';
  }
  const vids = media.filter((m) => m.type === 'video'), imgs = media.filter((m) => m.type === 'image');
  if (vids.length) { const v = await graph(`${pg}/videos`, { file_url: vids[0].url, description: cap }, t); return v.id; }
  if (imgs.length === 1) { const r = await graph(`${pg}/photos`, { url: imgs[0].url, caption: cap, published: 'true' }, t); return r.post_id || r.id; }
  if (imgs.length > 1) {
    const ids = []; for (const m of imgs.slice(0, 10)) ids.push((await graph(`${pg}/photos`, { url: m.url, published: 'false' }, t)).id);
    const r = await graph(`${pg}/feed`, { message: cap, attached_media: JSON.stringify(ids.map((id) => ({ media_fbid: id }))) }, t); return r.id;
  }
  const r = await graph(`${pg}/feed`, { message: cap }, t); return r.id;
}

// Instagram needs "create container, wait, publish". Videos can take a minute, so this can return {pending}.
async function igStep(conn, p, media, state) {
  const t = conn.token, ig = conn.ig_id; if (!ig) throw new Error('No Instagram professional account is linked to this Page.');
  let container = state && state.container;
  if (!container) {
    if (!media.length) throw new Error('Instagram needs at least one image or video.');
    const cap = p.caption;
    if (p.format === 'carousel' || (p.format === 'post' && media.length > 1)) {
      const kids = []; for (const m of media.slice(0, 10)) { if (m.type !== 'image') throw new Error('Carousels here support images only.'); kids.push((await graph(`${ig}/media`, { image_url: m.url, is_carousel_item: 'true' }, t)).id); }
      container = (await graph(`${ig}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: cap }, t)).id;
    } else {
      const m = media[0], params = {};
      if (p.format === 'story') { params.media_type = 'STORIES'; params[m.type === 'video' ? 'video_url' : 'image_url'] = m.url; }
      else if (m.type === 'video') { params.media_type = 'REELS'; params.video_url = m.url; params.caption = cap; params.share_to_feed = 'true'; }
      else { params.image_url = m.url; params.caption = cap; }
      container = (await graph(`${ig}/media`, params, t)).id;
    }
  }
  const st = await graph(container, { fields: 'status_code' }, t, 'GET').catch(() => ({ status_code: 'FINISHED' }));
  if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error('Instagram could not process this media (' + st.status_code + '). Check the file is a public JPG or an MP4 (H.264) and the aspect ratio.');
  if (st.status_code !== 'FINISHED') return { pending: true, container };
  const pub = await graph(`${ig}/media_publish`, { creation_id: container }, t);
  return { done: true, id: pub.id, container };
}

// Try each chosen platform once; remember what already worked so a retry never double-posts.
export async function publishPost(env, id) {
  const p = await env.DB.prepare('SELECT * FROM social_posts WHERE id=?').bind(id).first(); if (!p) throw new Error('Post not found.');
  const conn = await kvGet(env, 'meta', null); if (!conn || !conn.token) throw new Error('Connect your Facebook Page first (Social > Connections).');
  const media = mediaOf(p), plats = p.platforms.split(',').filter((x) => PLATFORMS.includes(x));
  let res = {}; try { res = JSON.parse(p.result_json) || {}; } catch {}
  await env.DB.prepare("UPDATE social_posts SET status='publishing' WHERE id=?").bind(id).run();
  for (const pl of plats) {
    if (res[pl] && res[pl].ok) continue;
    try {
      if (pl === 'facebook') { const pid = await fbPublish(conn, p, media); res.facebook = { ok: true, id: pid }; }
      else { const r = await igStep(conn, p, media, res.instagram); res.instagram = r.done ? { ok: true, id: r.id } : { pending: true, container: r.container }; }
    } catch (e) { res[pl] = { ok: false, error: String(e.message || e).slice(0, 300), container: undefined }; }
  }
  const st = plats.map((pl) => res[pl]);
  const status = st.every((x) => x && x.ok) ? 'published' : st.some((x) => x && x.pending) ? 'publishing' : st.some((x) => x && x.ok) ? 'partial' : 'failed';
  await env.DB.prepare('UPDATE social_posts SET status=?, result_json=?, published_at=CASE WHEN ?=\'published\' THEN ? ELSE published_at END WHERE id=?').bind(status, JSON.stringify(res), status, nowSql(), id).run();
  return { status, result: res };
}

// Called by the schedule runner: publish everything that is due.
export async function runDue(env) {
  const conn = await kvGet(env, 'meta', null); if (!conn || !conn.token) return { ran: 0, note: 'not connected' };
  // one runner at a time (the GitHub schedule and site visits can both trigger a run): take a 2 minute lock
  const now = Date.now();
  const got = await env.DB.prepare("INSERT INTO social_kv (k,v) VALUES ('lock',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v WHERE CAST(social_kv.v AS INTEGER) < ?").bind(String(now), now - 120000).run();
  if (!got.meta || got.meta.changes < 1) return { ran: 0, note: 'busy' };
  try { return await runDueLocked(env); } finally { await env.DB.prepare("UPDATE social_kv SET v='0' WHERE k='lock'").run().catch(() => {}); }
}

async function runDueLocked(env) {
  const { results } = await env.DB.prepare("SELECT id FROM social_posts WHERE auto=1 AND (status='publishing' OR (status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at<=?)) ORDER BY COALESCE(scheduled_at, created_at) LIMIT 5").bind(nowSql()).all();
  const out = []; for (const r of results) { try { out.push({ id: r.id, ...(await publishPost(env, r.id)) }); } catch (e) { out.push({ id: r.id, error: String(e.message) }); } }
  return { ran: out.length, out };
}

// Cheap check used by site visits: at most once every 3 minutes, run anything that is due.
export async function maybeRunDue(env) {
  try {
    const due = await env.DB.prepare("SELECT 1 AS x FROM social_posts WHERE auto=1 AND (status='publishing' OR (status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at<=?)) LIMIT 1").bind(nowSql()).first();
    if (!due) return;
    const last = await kvGet(env, 'tick', 0);
    if (Date.now() - Number(last) < 180000) return;
    await kvSet(env, 'tick', Date.now());
    await runDue(env);
  } catch {}
}

// One-time: add the 30-day content calendar (src/social-plan.js) to the Social tab as scheduled posts.
export async function ensurePlan(env) {
  const done = await env.DB.prepare("SELECT v FROM social_kv WHERE k='plan_v1'").first(); if (done) return 0;
  await env.DB.batch([
    ...PLAN.map((p) => env.DB.prepare("INSERT INTO social_posts (title,caption,format,platforms,media_json,scheduled_at,auto,status) VALUES (?,?,?,?,?,?,1,'scheduled')")
      .bind(p.t, p.c, p.f, 'instagram,facebook', JSON.stringify(p.m), p.at)),
    env.DB.prepare("INSERT INTO social_kv (k,v) VALUES ('plan_v1','1') ON CONFLICT(k) DO UPDATE SET v='1'"),
  ]);
  return PLAN.length;
}
