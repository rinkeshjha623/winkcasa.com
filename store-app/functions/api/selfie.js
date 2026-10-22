import { json } from '../../src/lib.js';
import { getCustomer } from '../../src/auth.js';

const CONSENT = 'I agree that WinkCasa may save this photo for 90 days to improve style suggestions. I can ask for it to be deleted at any time.';
const SHAPES = ['oval', 'round', 'square', 'heart', 'long'];

// Saves a selfie ONLY when the shopper ticked the consent box. Photos are deleted automatically after 90 days.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Not available.' }, 503);
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.consent !== true) return json({ error: 'Consent is needed to save a photo.' }, 400);
  const img = String(b.image || '');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(img) || img.length > 350000) return json({ error: 'Photo is not valid or too large.' }, 400);
  const shape = SHAPES.includes(b.shape) ? b.shape : null;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = ip ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('wc-selfie:' + ip)))].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('') : null;
  if (ipHash) {
    const n = (await env.DB.prepare("SELECT COUNT(*) n FROM selfies WHERE ip_hash=? AND created_at > datetime('now','-1 day')").bind(ipHash).first()).n;
    if (n >= 5) return json({ error: 'Daily limit reached.' }, 429);
  }
  const me = await getCustomer(request, env).catch(() => null);
  await env.DB.prepare("DELETE FROM selfies WHERE created_at < datetime('now','-90 days')").run();
  await env.DB.prepare('INSERT INTO selfies (customer_id, face_shape, image, ip_hash, consent_text) VALUES (?,?,?,?,?)').bind(me ? me.id : null, shape, img, ipHash, CONSENT).run();
  return json({ ok: true });
}
