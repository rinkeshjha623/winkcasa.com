import { json } from '../../src/lib.js';

// Public: submit a comment. Held for moderation; shown only after approval in the admin, and only when comments are switched on.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Not available.' }, 503);
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.website) return json({ ok: true, message: 'Thank you.' });                     // honeypot: bots fill this
  const on = await env.DB.prepare("SELECT value FROM settings WHERE key='comments_on'").first();
  if (!on || on.value !== '1') return json({ error: 'Comments are closed.' }, 403);
  const post = Number(b.post), name = String(b.name || '').trim().slice(0, 60), body = String(b.body || '').trim().slice(0, 1000);
  const email = String(b.email || '').trim().slice(0, 120);
  if (!(await env.DB.prepare('SELECT id FROM posts WHERE id=? AND published=1').bind(post).first())) return json({ error: 'Post not found.' }, 404);
  if (name.length < 2) return json({ error: 'Please enter your name.' }, 400);
  if (body.length < 5) return json({ error: 'Please write a little more.' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'That email does not look right.' }, 400);
  if (/https?:\/\/|www\./i.test(body + ' ' + name)) return json({ error: 'Please leave out web links.' }, 400);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = ip ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('wc-comment:' + ip)))].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('') : null;
  if (ipHash) {
    const n = (await env.DB.prepare("SELECT COUNT(*) n FROM comments WHERE ip_hash=? AND created_at > datetime('now','-1 hour')").bind(ipHash).first()).n;
    if (n >= 3) return json({ error: 'Please wait a little before commenting again.' }, 429);
  }
  await env.DB.prepare('INSERT INTO comments (post_id,name,email,body,ip_hash) VALUES (?,?,?,?,?)').bind(post, name, email || null, body, ipHash).run();
  return json({ ok: true, message: 'Thank you! Your comment will appear after we review it.' });
}
