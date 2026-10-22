// Customer accounts: PBKDF2 passwords, random session tokens (only their hash is stored), HttpOnly cookie.
const enc = new TextEncoder();
const COOKIE = 'wc_session', HINT = 'wc_in', DAYS = 30;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (t) => hex(await crypto.subtle.digest('SHA-256', enc.encode(t)));

export async function hashPassword(pw, saltHex) {
  const salt = saltHex || hex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return { hash: hex(bits), salt };
}

const eq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export async function checkPassword(pw, hash, salt) { return eq((await hashPassword(pw, salt)).hash, hash); }

export function cookieOf(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

export async function startSession(env, customerId) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const exp = new Date(Date.now() + DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.prepare('INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES (?,?,?)').bind(await sha(token), customerId, exp).run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  const a = `Path=/; Max-Age=${DAYS * 86400}; Secure; SameSite=Lax`;
  return [`${COOKIE}=${token}; HttpOnly; ${a}`, `${HINT}=1; ${a}`];
}

export const clearCookies = () => [`${COOKIE}=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax`, `${HINT}=; Path=/; Max-Age=0; Secure; SameSite=Lax`];

export async function endSession(request, env) {
  const t = cookieOf(request, COOKIE); if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(t)).run();
}

export async function getCustomer(request, env) {
  const t = cookieOf(request, COOKIE); if (!t || !env.DB) return null;
  return await env.DB.prepare(`SELECT c.id, c.email, c.name, c.phone FROM sessions s JOIN customers c ON c.id=s.customer_id
    WHERE s.token_hash=? AND s.expires_at > datetime('now')`).bind(await sha(t)).first();
}

export function jsonCookies(data, status, cookies = []) {
  const h = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(JSON.stringify(data), { status, headers: h });
}
