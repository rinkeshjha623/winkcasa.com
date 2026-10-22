import { json } from '../../src/lib.js';

const t = (v, n) => String(v ?? '').trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: bots fill this in
  const name = t(b.name, 80), email = t(b.email, 120), message = t(b.message, 2000);
  const phone = t(b.phone, 15), ref = t(b.order_ref, 20);
  if (name.length < 2) return json({ error: 'Please enter your name.' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (message.length < 10) return json({ error: 'Please tell us a little more (at least 10 characters).' }, 400);
  const recent = await env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE email=? AND created_at > datetime('now','-1 hour')").bind(email).first();
  if (recent.n >= 3) return json({ error: 'You have sent several messages already. Please wait a little before sending another.' }, 429);
  await env.DB.prepare('INSERT INTO messages (name,email,phone,order_ref,message) VALUES (?,?,?,?,?)').bind(name, email, phone || null, ref || null, message).run();
  return json({ ok: true });
}
