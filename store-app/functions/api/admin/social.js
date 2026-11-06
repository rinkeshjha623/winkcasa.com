import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { pinConnect, listBoards } from '../../../src/pinterest.js';
import { kvGet, kvSet, connectionInfo, connect, publishPost, runDue, FORMATS, PLATFORMS } from '../../../src/social.js';

const s = (v, n) => String(v ?? '').trim().slice(0, n);
const when = (v) => { const t = s(v, 25).replace('T', ' '); return /^\d{4}-\d\d-\d\d \d\d:\d\d/.test(t) ? t.slice(0, 16) + ':00' : null; };
const LIB_DEFAULT = { hashtags: [], ideas: [] };

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  const { results } = await env.DB.prepare('SELECT * FROM social_posts ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 400').all();
  return json({ posts: results, conn: await connectionInfo(env), library: await kvGet(env, 'library', LIB_DEFAULT) });
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const id = Number(b.id);
  try {
    switch (b.action) {
      case 'delete': await env.DB.prepare('DELETE FROM social_posts WHERE id=?').bind(id).run(); return json({ ok: true });
      case 'connect': return json({ ok: true, conn: { ...(await connect(env, b.token)), token: undefined } });
      case 'pin_connect': { const c = await pinConnect(kvSet, env, b.token, b.sandbox); return json({ ok: true, pin: { username: c.username, sandbox: c.sandbox, boards: c.boards } }); }
      case 'pin_boards': { const c = await kvGet(env, 'pinterest', null); if (!c) return json({ error: 'Connect Pinterest first.' }, 400); c.boards = await listBoards(c.token, c.sandbox); await kvSet(env, 'pinterest', c); return json({ ok: true, boards: c.boards }); }
      case 'pin_disconnect': await env.DB.prepare("DELETE FROM social_kv WHERE k='pinterest'").run(); return json({ ok: true });
      case 'disconnect': await env.DB.prepare("DELETE FROM social_kv WHERE k='meta'").run(); return json({ ok: true });
      case 'library': await kvSet(env, 'library', { hashtags: Array.isArray(b.hashtags) ? b.hashtags.slice(0, 30).map((h) => ({ name: s(h.name, 40), tags: s(h.tags, 600) })) : [] }); return json({ ok: true });
      case 'run': return json(await runDue(env));
      case 'publish': return json(await publishPost(env, id));
      case 'markposted': await env.DB.prepare("UPDATE social_posts SET status='published', published_at=datetime('now') WHERE id=?").bind(id).run(); return json({ ok: true });
      case 'status': {
        const st = ['draft', 'scheduled'].includes(b.status) ? b.status : 'draft';
        await env.DB.prepare('UPDATE social_posts SET status=? WHERE id=?').bind(st, id).run(); return json({ ok: true });
      }
      default: {
        const format = FORMATS.includes(b.format) ? b.format : 'post';
        const platforms = (Array.isArray(b.platforms) ? b.platforms : []).filter((p) => PLATFORMS.includes(p)).join(',');
        if (!platforms) return json({ error: 'Choose at least one platform.' }, 400);
        const media = (Array.isArray(b.media) ? b.media : []).slice(0, 10).map((m) => ({ url: s(m.url, 500), type: m.type === 'video' ? 'video' : 'image' })).filter((m) => m.url);
        const status = ['draft', 'scheduled'].includes(b.status) ? b.status : 'draft';
        const at = when(b.scheduled_at);
        if (status === 'scheduled' && !at) return json({ error: 'Pick a date and time to schedule.' }, 400);
        if (status === 'scheduled' && !s(b.caption, 2200) && !media.length) return json({ error: 'Add a caption or media first.' }, 400);
        const v = [s(b.title, 120), s(b.caption, 2200), format, platforms, JSON.stringify(media), at, b.auto === false || b.auto === 0 ? 0 : 1, status, s(b.note, 300) || null, s(b.pin_board, 60) || null, s(b.pin_link, 500) || null];
        if (id) { await env.DB.prepare("UPDATE social_posts SET title=?,caption=?,format=?,platforms=?,media_json=?,scheduled_at=?,auto=?,status=?,note=?,pin_board=?,pin_link=?, result_json=CASE WHEN status IN ('failed','partial') THEN '{}' ELSE result_json END WHERE id=?").bind(...v, id).run(); return json({ ok: true, id }); }
        const r = await env.DB.prepare('INSERT INTO social_posts (title,caption,format,platforms,media_json,scheduled_at,auto,status,note,pin_board,pin_link) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(...v).run();
        return json({ ok: true, id: r.meta.last_row_id });
      }
    }
  } catch (e) { return json({ error: String(e.message || e).slice(0, 300) }, 400); }
}
