// Read-only look at Search Console, Analytics 4 and Bing Webmaster, plus answer-engine (AEO) coverage checks that need no login.
import { ensureAgentTables } from './intel.js';

export const setupStatus = async (env) => {
  await ensureAgentTables(env);
  const planner = (await env.DB.prepare("SELECT COUNT(*) n FROM keyword_metrics WHERE source='planner'").first()).n;
  return { gsc: !!env.GOOGLE_SA_JSON, ga4: !!(env.GOOGLE_SA_JSON && env.GA4_PROPERTY_ID), bing: !!env.BING_WEBMASTER_KEY, keywordPlanner: planner > 0, adsApi: !!(env.GOOGLE_ADS_DEVELOPER_TOKEN && env.GOOGLE_SA_JSON) };
};
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
async function googleToken(env, scope) {
  const sa = JSON.parse(env.GOOGLE_SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const head = enc({ alg: 'RS256', typ: 'JWT' }), claim = enc({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 });
  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim)));
  const r = await timedFetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + head + '.' + claim + '.' + sig });
  const j = await r.json(); if (!j.access_token) throw new Error('Google sign-in failed: ' + (j.error_description || j.error || r.status));
  return j.access_token;
}
const day = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
async function gscQueries(env) {
  const tok = await googleToken(env, 'https://www.googleapis.com/auth/webmasters.readonly');
  const site = encodeURIComponent(env.GSC_SITE || 'sc-domain:winkcasa.com');
  const r = await timedFetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ startDate: day(28), endDate: day(2), dimensions: ['query'], rowLimit: 200 }) });
  const j = await r.json(); if (!r.ok) throw new Error('Search Console: ' + (j.error?.message || r.status));
  return (j.rows || []).map((x) => ({ kw: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
}
async function ga4Summary(env) {
  const tok = await googleToken(env, 'https://www.googleapis.com/auth/analytics.readonly');
  const r = await timedFetch(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA4_PROPERTY_ID}:runReport`, { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }] }) });
  const j = await r.json(); if (!r.ok) throw new Error('Analytics: ' + (j.error?.message || r.status));
  return (j.rows || []).map((x) => `${x.dimensionValues[0].value}: ${x.metricValues[0].value} sessions, ${x.metricValues[1].value} users`);
}
const timedFetch = (u, o = {}) => fetch(u, { ...o, signal: AbortSignal.timeout(8000) });
async function bingQueries(env) {
  let last = 'no reply';
  for (const site of ['https://www.winkcasa.com/', 'https://www.winkcasa.com']) {
    const r = await timedFetch(`https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?apikey=${encodeURIComponent(String(env.BING_WEBMASTER_KEY).trim())}&siteUrl=${encodeURIComponent(site)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) return (j.d || []).slice(0, 100).map((x) => ({ kw: String(x.Query || '').toLowerCase(), clicks: x.Clicks, impressions: x.Impressions, position: x.AvgImpressionPosition }));
    last = `${r.status} ${String(j.Message || j.message || '').slice(0, 120)} (site ${site})`;
  }
  throw new Error('Bing Webmaster: ' + last);
}

const tokens = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'for', 'and', 'what', 'how', 'best', 'are', 'can', 'you', 'with', 'which', 'why', 'does'].includes(w));
// Real shopper questions that no published post heading or title answers.
export async function answerGaps(env, limit = 3) {
  const qs = (await env.DB.prepare("SELECT kw FROM keywords WHERE intent='question' AND covered=0 ORDER BY score DESC LIMIT 40").all()).results.map((r) => r.kw);
  const posts = (await env.DB.prepare('SELECT title, body FROM posts WHERE published=1').all().catch(() => ({ results: [] }))).results;
  const text = posts.map((p) => tokens(p.title + ' ' + (String(p.body).match(/^#{2,3} .+$/gm) || []).join(' ')));
  const gaps = qs.filter((q) => { const t = tokens(q); return t.length && !text.some((pt) => t.filter((w) => pt.includes(w)).length / t.length >= 0.7); });
  const queued = new Set((await env.DB.prepare('SELECT kw FROM topic_queue').all()).results.map((r) => r.kw));
  return gaps.filter((g) => !queued.has(g)).slice(0, limit);
}

export async function runInsights(env) {
  await ensureAgentTables(env);
  const lines = [], missing = [], st = await setupStatus(env);
  const rows = [];
  if (st.gsc) { try { const q = await gscQueries(env); rows.push(...q); lines.push(`Search Console: ${q.length} searches in the last 4 weeks.`);
    for (const r of q) await env.DB.prepare("INSERT INTO keyword_metrics (kw,impressions,position,source,at) VALUES (?,?,?,'gsc',datetime('now')) ON CONFLICT(kw) DO UPDATE SET impressions=excluded.impressions, position=excluded.position, at=datetime('now') WHERE keyword_metrics.source!='planner' OR keyword_metrics.volume IS NULL").bind(r.kw, r.impressions, r.position).run();
    const near = q.filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 5);
    if (near.length) lines.push('Close to page 1 (improve these pages): ' + near.map((r) => `${r.kw} (pos ${r.position.toFixed(1)}, ${r.impressions} views)`).join('; '));
    const lowCtr = q.filter((r) => r.position <= 10 && r.impressions >= 30 && r.ctr < 0.02).slice(0, 5);
    if (lowCtr.length) lines.push('On page 1 but rarely clicked (rewrite title/description): ' + lowCtr.map((r) => r.kw).join('; '));
  } catch (e) { lines.push('Search Console failed: ' + e.message); } } else missing.push('Search Console: add secret GOOGLE_SA_JSON (a Google service account key) and add that account\'s email as a user in Search Console.');
  if (st.ga4) { try { lines.push('Analytics (7 days): ' + (await ga4Summary(env)).join(' | ')); } catch (e) { lines.push('Analytics failed: ' + e.message); } } else missing.push('Analytics 4: add GOOGLE_SA_JSON and GA4_PROPERTY_ID, and give that account Viewer access on the property.');
  if (st.bing) { try { const b = await bingQueries(env); lines.push(`Bing Webmaster: ${b.length} searches. Top: ${b.slice(0, 5).map((x) => x.kw).join('; ')}`); } catch (e) { lines.push('Bing failed: ' + e.message); } } else missing.push('Bing Webmaster: add secret BING_WEBMASTER_KEY (Bing Webmaster Tools > Settings > API access).');
  const gaps = await answerGaps(env);
  for (const g of gaps) await env.DB.prepare('INSERT INTO topic_queue (kw,why) VALUES (?,?)').bind(g, 'Shoppers ask this and no page answers it (answer-engine and AI citation gap)').run();
  if (gaps.length) lines.push('Questions with no answer on the site, queued as topics: ' + gaps.join(' | '));
  const noAi = (await env.DB.prepare("SELECT COUNT(*) n FROM products WHERE active=1 AND (ai_answer IS NULL OR ai_answer='')").first().catch(() => ({ n: 0 }))).n;
  if (noAi) lines.push(`${noAi} live product(s) have no AI-answer line (the short factual answer that search and AI assistants quote).`);
  if (missing.length) lines.push('', 'Not connected yet:', ...missing.map((m) => '• ' + m));
  return { lines, missing, gaps: gaps.length, connected: Object.values(st).filter(Boolean).length };
}
