import { json } from '../../src/lib.js';
import { runDue } from '../../src/social.js';

// Publishes posts whose time has come. It takes no input and only acts on posts already scheduled
// in the admin, so it is safe to call from a scheduler (a GitHub Action calls it every few minutes).
export async function onRequest({ env }) {
  if (!env.DB) return json({ ok: false }, 500);
  return json({ ok: true, ...(await runDue(env)) });
}
