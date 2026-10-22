import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { getSettings, cleanSettings } from '../../../src/store.js';

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  return json(await getSettings(env));
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const clean = cleanSettings(b);
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('site',?)").bind(JSON.stringify(clean)).run();
  return json({ ok: true, settings: clean });
}
