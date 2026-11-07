import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { keywordSummary } from '../../../src/keywords.js';
import { SKILLS, agentState, setAgent, runAgent } from '../../../src/agent.js';

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  const st = await agentState(env);
  const { results } = await env.DB.prepare("SELECT * FROM agent_log ORDER BY id DESC LIMIT 120").all();
  const report = await env.DB.prepare("SELECT * FROM agent_log WHERE level='report' ORDER BY id DESC LIMIT 1").first();
  return json({ skills: SKILLS.map((s) => ({ ...s, on: !!st.on[s.id], last: st.last[s.id] || 0, missing: !!s.needs && !(s.needs === 'GEMINI_API_KEY' ? env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY : env[s.needs]) })), autoBlog: st.autoBlog, log: results, report, keywords: await keywordSummary(env), team: (await env.DB.prepare("SELECT id,title,stage,status,scheduled_at,review_json FROM social_posts WHERE stage IS NOT NULL ORDER BY id DESC LIMIT 25").all()).results });
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  try {
    if (b.action === 'toggle') { await setAgent(env, { skill: b.skill, enabled: b.enabled }); return json({ ok: true }); }
    if (b.action === 'autoblog') { await setAgent(env, { autoBlog: !!b.enabled }); return json({ ok: true }); }
    if (b.action === 'run') return json(await runAgent(env, { only: SKILLS.some((s) => s.id === b.skill) ? b.skill : undefined, force: true }));
    if (b.action === 'clear') { await env.DB.prepare("DELETE FROM agent_log WHERE level IN ('info') OR at < datetime('now','-30 days')").run(); return json({ ok: true }); }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) { return json({ error: String(e.message || e).slice(0, 300) }, 400); }
}
