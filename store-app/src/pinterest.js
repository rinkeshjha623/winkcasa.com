// Pinterest publishing through the official v5 API. The access token lives in D1 (social_kv 'pinterest') and is never sent back to the browser in full.
// Trial access only works against the sandbox host; Standard access (after Pinterest approves the app) uses production.
const API = (c) => (c && c.sandbox ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5');

async function pin(path, token, sandbox, method = 'GET', body) {
  const r = await fetch(API({ sandbox }) + path, { method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Pinterest: ' + (j.message || j.error_description || 'error ' + r.status) + (j.code ? ' (code ' + j.code + ')' : ''));
  return j;
}

export async function listBoards(token, sandbox) {
  const out = []; let bm = '';
  for (let i = 0; i < 5; i++) {
    const r = await pin('/boards?page_size=100' + (bm ? '&bookmark=' + encodeURIComponent(bm) : ''), token, sandbox);
    for (const b of r.items || []) out.push({ id: b.id, name: b.name });
    bm = r.bookmark; if (!bm) break;
  }
  return out;
}

export async function pinConnect(kvSet, env, token, sandbox) {
  token = String(token || '').trim(); if (token.length < 20) throw new Error('Paste the full Pinterest access token.');
  sandbox = !!sandbox;
  const u = await pin('/user_account', token, sandbox);
  const boards = await listBoards(token, sandbox).catch(() => []);
  const conn = { token, sandbox, username: u.username || '', boards };
  await kvSet(env, 'pinterest', conn);
  return conn;
}

export const pinInfo = (c) => (c && c.token ? { connected: true, username: c.username || '', sandbox: !!c.sandbox, boards: c.boards || [], token_tail: c.token.slice(-4) } : { connected: false });

export async function pinPublish(conn, p, media) {
  if (!p.pin_board) throw new Error('Choose a Pinterest board for this post.');
  const img = media.find((m) => m.type === 'image'); if (!img) throw new Error('Pinterest needs an image (video is not supported here).');
  if (!/^https?:\/\//.test(p.pin_link || '')) throw new Error('Add the link the Pin should open (a winkcasa.com page).');
  const desc = String(p.caption || '').replace(/\s+/g, ' ').trim().slice(0, 800);
  const r = await pin('/pins', conn.token, conn.sandbox, 'POST', { board_id: p.pin_board, title: String(p.title || desc).slice(0, 100), description: desc, link: p.pin_link, media_source: { source_type: 'image_url', url: img.url } });
  return r.id;
}
