import { json } from '../../src/lib.js';
import { runAgent } from '../../src/agent.js';
import { cronGuard } from '../../src/guard.js';

// Runs the agent's due skills. It takes no input and can only do the fixed skills in src/agent.js, so it is safe for a scheduler to call.
export async function onRequest({ request, env }) {
  if (!env.DB) return json({ ok: false }, 500);
  const g = await cronGuard(request, env, 'agent', 240); if (g) return g;
  return json({ ok: true, ...(await runAgent(env)) });
}
