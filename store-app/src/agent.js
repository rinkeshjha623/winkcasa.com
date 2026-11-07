// The WinkCasa agent: a fixed set of skills, each with its own guard rails. It never does anything outside these skills.
// Every run is written to agent_log (Admin > Agent). Turn a skill off there and the agent stops doing it.
import { kvGet } from './social.js';
import { syncOrders, pushOrder } from './cj-orders.js';
import { submitIndexNow } from './indexnow.js';
import { productPath } from './store.js';
import { keywordResearch, topKeywords } from './keywords.js';
import { hasKey, writePost, improveProduct } from './writer.js';
import { researchDesk, visualDesk, writerDesk, managerDesk, safetyNet } from './social-team.js';
import { SITE_ORIGIN, absUrl } from './social.js';

const sql = (d = new Date()) => d.toISOString().slice(0, 19).replace('T', ' ');
const IST = 330 * 60000;
const istDay = (d = new Date()) => new Date(d.getTime() + IST).toISOString().slice(0, 10);
const istHour = () => new Date(Date.now() + IST).getUTCHours();
const rupees = (p) => '₹' + Math.round((p || 0) / 100).toLocaleString('en-IN');

export const SKILLS = [
  { id: 'keyword_research', title: 'Keyword research (runs first)', about: 'Reads Google and Amazon.in search suggestions for every product type, keeps what shoppers in India really type, scores it, and marks which keywords already have a page and which are gaps. The social, blog, SEO and report skills all use this list.', everyMin: 240, cost: 22 },
  { id: 'cj_orders', title: 'Orders to CJ and tracking', about: 'Sends paid CJ orders to CJ (you still pay them inside CJ) and pulls tracking and delivery status back. Up to 5 orders per run.', everyMin: 30, needs: 'CJ_API_KEY', cost: 10 },
  { id: 'order_watch', title: 'Order watch', about: 'Flags paid orders not sent to CJ, orders with no tracking after 4 days, parcels not delivered after 21 days, and refund requests.', everyMin: 120 },
  { id: 'content_writer', title: 'Blog writer (from keywords)', about: 'Takes the best keyword gap and writes one blog draft with Claude (up to 2 a day). The review skill below then checks it and publishes it if it passes.', everyMin: 360, needs: 'GEMINI_API_KEY' },
  { id: 'product_copy', title: 'Product description writer', about: 'Rewrites thin product descriptions (under 80 characters) from the product facts only. Up to 4 per run, nothing invented.', everyMin: 360, needs: 'GEMINI_API_KEY' },
  { id: 'social_fill', title: 'Social planner', about: 'Picks one product a day for the next 7 days (not posted in 45 days, rotating categories) and hands it to the team below. Nothing is scheduled until the manager approves it.', everyMin: 360, cost: 0 },
  { id: 'social_research', title: 'Research team: keywords and topic', about: 'For each planned post, picks the keywords from our keyword list that match the product and the seasonal topic (festive, wedding season and so on).', everyMin: 15, cost: 0 },
  { id: 'social_visual', title: 'Visual expert: image, video, graphics', about: 'Checks the image loads, is sharp enough and the right shape (drops Instagram if the shape is not allowed). With an AI key it also looks at the picture and rejects blurry, off-product or watermarked images. Videos are checked to load.', everyMin: 15, cost: 8 },
  { id: 'social_writer', title: 'Content writer: caption and pin text', about: 'Writes the caption, Pin title and Pin description from the keywords and topic, using only the product facts. Falls back to a plain template if no AI key is set.', everyMin: 15, cost: 4 },
  { id: 'social_manager', title: 'Manager: final review, then schedule', about: 'Checks price, claims, hashtags, links, board and duplicates, and reads the copy. Approved posts are scheduled for publishing. Rejected copy goes back to the writer once, then is dropped. Also safety-checks other auto posts due in 24 hours.', everyMin: 15, cost: 4 },
  { id: 'seo_health', title: 'SEO and indexing', about: 'Sends all pages to Bing/IndexNow once a day and checks products and posts for missing images, thin text or duplicate names.', everyMin: 1440 },
  { id: 'content_review', title: 'Blog and comment review', about: 'Checks blog drafts (length, headings, links, risky claims) and publishes one that passes per day. Approves clean comments and holds the rest.', everyMin: 360 },
  { id: 'daily_report', title: 'Daily business report', about: 'At 8 AM India time: yesterday and 7-day sales, what needs attention, and the social queue.', everyMin: 1440, hourIst: 8 },
  { id: 'ads', title: 'Google Ads', about: 'Needs Google Ads API access before it can read or change a campaign. Not active: ads are reviewed with you in Claude for now.', everyMin: 0, locked: true },
];
const DEFAULT_ON = { social_research: true, social_visual: true, social_writer: true, social_manager: true, keyword_research: true, content_writer: true, product_copy: true, cj_orders: true, order_watch: true, social_fill: true, seo_health: true, content_review: true, daily_report: true };

export async function agentState(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='agent'").first();
  let st = {}; try { st = row ? JSON.parse(row.value) : {}; } catch {}
  return { on: { ...DEFAULT_ON, ...(st.on || {}) }, last: st.last || {}, autoBlog: st.autoBlog !== false };
}
const saveState = (env, st) => env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('agent',?)").bind(JSON.stringify({ on: st.on, last: st.last, autoBlog: st.autoBlog })).run();
export async function setAgent(env, patch) {
  const st = await agentState(env);
  if (patch.skill && SKILLS.some((s) => s.id === patch.skill && !s.locked)) st.on[patch.skill] = !!patch.enabled;
  if (typeof patch.autoBlog === 'boolean') st.autoBlog = patch.autoBlog;
  await saveState(env, st); return st;
}
const note = (env, skill, level, title, detail) => env.DB.prepare('INSERT INTO agent_log (skill,level,title,detail) VALUES (?,?,?,?)').bind(skill, level, String(title).slice(0, 200), detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 6000)).run();

// ---------- skills ----------
async function cjOrders(env) {
  if (!env.CJ_API_KEY) return { quiet: true, summary: 'CJ is not connected.' };
  const out = { pushed: 0, issues: [] };
  const { results } = await env.DB.prepare("SELECT order_ref FROM orders WHERE status='paid' AND cj_order_id IS NULL AND fulfilment_status IN ('new') AND created_at > datetime('now','-14 days') ORDER BY id LIMIT 5").all();
  for (const o of results) {
    try { const r = await pushOrder(env, o.order_ref); if (r.ok) { out.pushed++; await note(env, 'cj_orders', 'action', `Sent ${o.order_ref} to CJ`, `CJ order ${r.cjOrderId}. It is unpaid in CJ: pay it in CJ → Orders → Waiting for payment.`); } else out.issues.push(`${o.order_ref}: ${r.error}`); }
    catch (e) { out.issues.push(`${o.order_ref}: ${e.message}`); }
  }
  const sy = await syncOrders(env).catch((e) => ({ error: e.message }));
  if (out.issues.length) await note(env, 'cj_orders', 'alert', `${out.issues.length} order(s) could not go to CJ`, out.issues.join('\n'));
  return { summary: `Sent ${out.pushed} to CJ, checked ${sy.checked ?? 0} for tracking, ${sy.changed ?? 0} updated.`, quiet: !out.pushed && !out.issues.length && !sy.changed };
}

async function orderWatch(env) {
  const q = async (s) => (await env.DB.prepare(s).all()).results;
  const a = await q("SELECT order_ref FROM orders WHERE status='paid' AND cj_order_id IS NULL AND fulfilment_status='new' AND paid_at < datetime('now','-6 hours') AND created_at > datetime('now','-30 days') LIMIT 20");
  const b = await q("SELECT order_ref FROM orders WHERE status='paid' AND fulfilment_status='ordered' AND (tracking_number IS NULL OR tracking_number='') AND paid_at < datetime('now','-4 days') LIMIT 20");
  const c = await q("SELECT order_ref FROM orders WHERE fulfilment_status='shipped' AND shipped_at < datetime('now','-21 days') LIMIT 20");
  const d = await q("SELECT order_ref FROM orders WHERE refund_status NOT IN ('none','refunded') LIMIT 20");
  const lines = [];
  if (a.length) lines.push(`Paid but not sent to supplier for 6+ hours: ${a.map((x) => x.order_ref).join(', ')}`);
  if (b.length) lines.push(`Ordered 4+ days ago, no tracking yet: ${b.map((x) => x.order_ref).join(', ')}`);
  if (c.length) lines.push(`Shipped 21+ days ago, not delivered: ${c.map((x) => x.order_ref).join(', ')}`);
  if (d.length) lines.push(`Refund waiting for you: ${d.map((x) => x.order_ref).join(', ')}`);
  if (lines.length) { await note(env, 'order_watch', 'alert', `${lines.length} order issue(s) need you`, lines.join('\n')); return { summary: lines.length + ' issue type(s) flagged.' }; }
  return { summary: 'All orders on track.', quiet: true };
}

const BOARD = [[/earring|jewel|necklace|ring|bracelet|anklet/i, /earring|jewel|necklace/i], [/hair|clip|head/i, /hair/i], [/beauty|makeup|brush|face|nail|lash|roller/i, /beauty|makeup/i], [/dress|kurti|ethnic|saree/i, /dress|ethnic/i], [/lantern|decor|light|diya/i, /lantern|decor|light/i]];
const TAGS = [[/earring|jewel|necklace|bracelet|ring|anklet|pendant/i, '#WinkCasa #Jewellery #Earrings #EverydayJewellery #ShopIndia'], [/hair|clip|head/i, '#WinkCasa #HairAccessories #ClawClip #HairStyleIdeas'], [/beauty|makeup|brush|nail|lash|roller/i, '#WinkCasa #BeautyTools #MakeupBrushes #SelfCare'], [/dress|kurti|ethnic/i, '#WinkCasa #DressesForWomen #OOTD #IndianFashion']];
const pick = (rules, cat, fallback = '#WinkCasa #ShopIndia') => { for (const [r, v] of rules) if (r.test(cat)) return v; return fallback; };
const trimName = (n) => String(n).replace(/\s+/g, ' ').trim().slice(0, 90);

async function socialFill(env) {
  const meta = await kvGet(env, 'meta', null), pin = await kvGet(env, 'pinterest', null);
  const plats = [];
  if (meta && meta.token) { plats.push('facebook'); if (meta.ig_id) plats.push('instagram'); }
  const pinOk = pin && pin.token && !pin.sandbox; if (pinOk) plats.push('pinterest');
  if (!plats.length) return { summary: 'No social account is connected for live posting yet (Pinterest in sandbox mode does not count).', quiet: true };
  const days = []; for (let i = 1; i <= 7; i++) days.push(new Date(Date.now() + i * 86400000));
  const slotUtc = (d) => istDay(d) + ' 14:00:00'; // 7:30 PM India
  const have = new Set((await env.DB.prepare("SELECT scheduled_at FROM social_posts WHERE (status IN ('scheduled','publishing') OR stage IN ('research','visual','writing','review')) AND scheduled_at >= datetime('now')").all()).results.map((r) => String(r.scheduled_at).slice(0, 10)));
  const need = days.filter((d) => !have.has(slotUtc(d).slice(0, 10)));
  if (!need.length) return { summary: 'Next 7 days already filled.', quiet: true };
  const used = new Set((await env.DB.prepare("SELECT note FROM social_posts WHERE note LIKE 'agent:p%' AND created_at > datetime('now','-45 days')").all()).results.map((r) => r.note));
  let { results: prods } = await env.DB.prepare("SELECT * FROM products WHERE active=1 AND noindex=0 AND (stock IS NULL OR stock>0) AND images_json NOT IN ('[]','') ORDER BY id DESC LIMIT 400").all();
  prods = prods.filter((p) => !used.has('agent:p' + p.id)); const seenCat = {}; let made = 0; const titles = [];
  for (const d of need.slice(0, 7)) {
    // rotate categories: prefer the category used least in this run
    prods.sort((a, b) => (seenCat[a.category] || 0) - (seenCat[b.category] || 0) || Math.random() - 0.5);
    const p = prods.shift(); if (!p) break; seenCat[p.category] = (seenCat[p.category] || 0) + 1;
    let imgs = []; try { imgs = JSON.parse(p.images_json) || []; } catch {}
    const url = imgs.find((u) => typeof u === 'string' && u); if (!url) continue;
    const name = trimName(p.name), link = SITE_ORIGIN + productPath(p), price = '₹' + Number(p.price).toLocaleString('en-IN');
    const kwTags = (await topKeywords(env, p.category + ' ' + p.name, 3)).map((k) => '#' + k.replace(/[^a-z0-9]/g, '')).join(' ');
    const caption = `${name}\n\n${price} · Free delivery above ₹999 · 7-day returns\nShop it at winkcasa.com\n\n${pick(TAGS, p.category)} ${kwTags}`.trim();
    const board = pin && pin.boards ? (pin.boards.find((b) => BOARD.some(([c, bn]) => c.test(p.category + ' ' + p.name) && bn.test(b.name))) || pin.boards[0] || {}).id : null;
    await env.DB.prepare("INSERT INTO social_posts (title,caption,format,platforms,media_json,scheduled_at,auto,status,note,pin_board,pin_link,stage,product_id) VALUES (?,?,?,?,?,?,1,'draft',?,?,?,'research',?)")
      .bind(name.slice(0, 100), caption, 'post', plats.join(','), JSON.stringify([{ url: absUrl(url), type: 'image' }]), slotUtc(d), 'agent:p' + p.id, board || null, link + '?utm_source=social&utm_medium=agent', p.id).run();
    made++; titles.push(name.slice(0, 40));
  }
  if (made) await note(env, 'social_fill', 'action', `Planned ${made} product post(s) for ${plats.join(', ')}, sent to the team`, titles.join('\n'));
  return { summary: `Planned ${made} post(s).`, quiet: !made };
}

async function seoHealth(env) {
  const idx = await submitIndexNow(env).catch((e) => ({ ok: false, status: e.message }));
  const q = async (s) => (await env.DB.prepare(s).all()).results;
  const noImg = await q("SELECT id,name FROM products WHERE active=1 AND (images_json='[]' OR images_json='') LIMIT 20");
  const thin = await q("SELECT id,name FROM products WHERE active=1 AND LENGTH(description)<80 LIMIT 20");
  const dup = await q("SELECT name, COUNT(*) c FROM products WHERE active=1 GROUP BY name HAVING c>1 LIMIT 20");
  const noKw = (await q("SELECT COUNT(*) n FROM products WHERE active=1 AND (focus_keyword IS NULL OR focus_keyword='')"))[0].n;
  const issues = [];
  if (noImg.length) issues.push(`Products with no image: ${noImg.map((x) => '#' + x.id).join(', ')}`);
  if (thin.length) issues.push(`Products with very short description: ${thin.map((x) => '#' + x.id).join(', ')}`);
  if (dup.length) issues.push(`Duplicate product names: ${dup.map((x) => x.name.slice(0, 40)).join(' | ')}`);
  if (noKw) issues.push(`${noKw} product(s) have no focus keyword.`);
  const gk = (await q("SELECT kw FROM keywords WHERE covered=0 AND intent='buy' ORDER BY score DESC LIMIT 8")).map((x) => x.kw);
  if (gk.length) issues.push('Buying keywords with no page yet: ' + gk.join(' | '));
  if (!idx.ok) issues.push('IndexNow submission failed: ' + idx.status);
  await note(env, 'seo_health', issues.length ? 'warn' : 'info', `IndexNow ${idx.ok ? 'accepted ' + idx.submitted + ' URLs' : 'failed'}; ${issues.length} issue type(s)`, issues.join('\n') || 'No issues found.');
  return { summary: `${idx.submitted || 0} URLs sent, ${issues.length} issue type(s).`, quiet: true };
}

const RISKY = /\b(cure[sd]?|guarantee[sd]?|100% (safe|natural|genuine)|miracle|heals?|treats? (acne|eczema|disease)|anti-?cancer|lose weight fast|doctor recommended|clinically proven)\b/i;
export function reviewPost(p) {
  const words = String(p.body || '').split(/\s+/).filter(Boolean).length, probs = [];
  if (words < 600) probs.push(`only ${words} words (need 600+)`);
  if ((String(p.body || '').match(/^## /gm) || []).length < 3) probs.push('fewer than 3 sections');
  if (!/\]\(\/(p|c)\/|\]\(https:\/\/www\.winkcasa\.com/.test(p.body || '')) probs.push('no link to a product or category');
  if (String(p.title || '').length < 20 || String(p.title).length > 70) probs.push('title should be 20 to 70 characters');
  if (String(p.excerpt || '').length < 60) probs.push('excerpt too short');
  const m = RISKY.exec(p.body + ' ' + p.title); if (m) probs.push(`risky claim: "${m[0]}"`);
  return probs;
}
async function contentReview(env, st) {
  const drafts = (await env.DB.prepare("SELECT * FROM posts WHERE published=0 ORDER BY id LIMIT 10").all()).results;
  const out = []; let published = 0;
  const todays = (await env.DB.prepare("SELECT COUNT(*) n FROM agent_log WHERE skill='content_review' AND level='action' AND title LIKE 'Published%' AND at > datetime('now','-1 day')").first()).n;
  for (const p of drafts) {
    const probs = reviewPost(p);
    if (!probs.length && st.autoBlog && !published && !todays) {
      await env.DB.prepare("UPDATE posts SET published=1, published_at=datetime('now') WHERE id=?").bind(p.id).run(); published++;
      await note(env, 'content_review', 'action', `Published: ${p.title}`, `/blog/${p.slug}`);
    } else if (probs.length) out.push(`"${p.title}": ${probs.join('; ')}`);
  }
  if (out.length) await note(env, 'content_review', 'warn', `${out.length} draft(s) need edits before they can go live`, out.join('\n'));
  // comments: approve plain, polite ones; hold links and spam words
  const cm = (await env.DB.prepare("SELECT id, body, name FROM comments WHERE status='pending' ORDER BY id LIMIT 20").all()).results;
  let ok = 0, held = 0;
  for (const c of cm) {
    const spam = /https?:\/\/|www\.|\.com\b|casino|loan|crypto|viagra|seo service|whatsapp|telegram|click here/i.test(c.body + ' ' + c.name) || c.body.length < 3 || c.body.length > 1200;
    if (spam) { held++; continue; }
    await env.DB.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(c.id).run(); ok++;
  }
  if (ok || held) await note(env, 'content_review', held ? 'warn' : 'action', `Comments: ${ok} approved, ${held} held for you`, null);
  return { summary: `${published} post published, ${out.length} drafts need edits, ${ok} comments approved, ${held} held.`, quiet: !published && !out.length && !ok && !held };
}

async function dailyReport(env) {
  const one = async (s, ...b) => env.DB.prepare(s).bind(...b).first();
  const day = istDay(new Date(Date.now() - 86400000));
  const rng = (from, to) => `status='paid' AND date(datetime(paid_at,'+330 minutes')) BETWEEN '${from}' AND '${to}'`;
  const y = await one(`SELECT COUNT(*) n, COALESCE(SUM(total_paise),0) t FROM orders WHERE ${rng(day, day)}`);
  const w = await one(`SELECT COUNT(*) n, COALESCE(SUM(total_paise),0) t FROM orders WHERE ${rng(istDay(new Date(Date.now() - 7 * 86400000)), day)}`);
  const m = await one(`SELECT COUNT(*) n, COALESCE(SUM(total_paise),0) t FROM orders WHERE ${rng(istDay(new Date(Date.now() - 30 * 86400000)), day)}`);
  const open = await one("SELECT COUNT(*) n FROM orders WHERE status='paid' AND fulfilment_status IN ('new','ordered','shipped')");
  const prods = await one('SELECT COUNT(*) n FROM products WHERE active=1');
  const drafts = await one('SELECT COUNT(*) n FROM posts WHERE published=0');
  const pend = await one("SELECT COUNT(*) n FROM comments WHERE status='pending'");
  const queue = await one("SELECT COUNT(*) n FROM social_posts WHERE status='scheduled'");
  const alerts = (await env.DB.prepare("SELECT title FROM agent_log WHERE level IN ('alert','warn') AND at > datetime('now','-1 day') ORDER BY id DESC LIMIT 8").all()).results.map((r) => r.title);
  const lines = [`Yesterday (${day}): ${y.n} order(s), ${rupees(y.t)}`, `Last 7 days: ${w.n} order(s), ${rupees(w.t)}`, `Last 30 days: ${m.n} order(s), ${rupees(m.t)}`, `Orders in progress: ${open.n}`, `Live products: ${prods.n} · Blog drafts: ${drafts.n} · Comments waiting: ${pend.n} · Social posts queued: ${queue.n}`];
  const kws = (await env.DB.prepare("SELECT kw FROM keywords WHERE covered=0 AND intent!='question' ORDER BY score DESC LIMIT 5").all()).results.map((r) => r.kw);
  if (kws.length) lines.push('Top keyword gaps: ' + kws.join(' | '));
  if (alerts.length) lines.push('', 'Needs attention:', ...alerts.map((a) => '• ' + a));
  await note(env, 'daily_report', 'report', `Daily report ${day}`, lines.join('\n'));
  return { summary: lines[0] + '; ' + lines[1], quiet: true };
}

async function keywordSkill(env) {
  const r = await keywordResearch(env);
  const top = r.fresh ? (await env.DB.prepare("SELECT kw,intent,score FROM keywords WHERE covered=0 AND intent!='question' ORDER BY found_at DESC, score DESC LIMIT 8").all()).results : [];
  if (r.fresh) await note(env, 'keyword_research', 'action', `${r.fresh} new keyword(s) from ${r.seeds.join(', ')}`, top.map((t) => `${t.kw} (${t.intent}, score ${t.score})`).join('\n'));
  return { summary: `${r.found} keywords seen, ${r.fresh} new (${r.calls} lookups).`, quiet: true };
}

async function contentWriter(env) {
  if (!hasKey(env)) return { summary: 'Waiting for an AI key (GEMINI_API_KEY) on the server.', quiet: true };
  const today = (await env.DB.prepare("SELECT COUNT(*) n FROM agent_log WHERE skill='content_writer' AND level='action' AND at > datetime('now','-1 day')").first()).n;
  const queued = (await env.DB.prepare('SELECT COUNT(*) n FROM posts WHERE published=0').first()).n;
  if (today >= 2) return { summary: 'Daily limit of 2 drafts reached.', quiet: true };
  if (queued >= 5) return { summary: 'Five drafts are already waiting for review.', quiet: true };
  const kw = await env.DB.prepare("SELECT kw,intent,score FROM keywords WHERE covered=0 AND status='new' AND (intent='question' OR kw LIKE '%for women%' OR kw LIKE '%design%' OR kw LIKE '%set%' OR kw LIKE '%under%') ORDER BY (intent='question') DESC, score DESC LIMIT 1").first();
  if (!kw) return { summary: 'No keyword gap ready to write.', quiet: true };
  const r = await writePost(env, kw);
  await note(env, 'content_writer', 'action', `Drafted: ${r.title}`, `Keyword "${kw.kw}" · ${r.words} words · /blog/${r.slug} (draft, goes through review)`);
  return { summary: `Drafted "${r.title}".`, quiet: true };
}

async function productCopy(env) {
  if (!hasKey(env)) return { summary: 'Waiting for an AI key (GEMINI_API_KEY) on the server.', quiet: true };
  const { results } = await env.DB.prepare("SELECT id,name,category,material,price FROM products WHERE active=1 AND LENGTH(description)<80 ORDER BY id LIMIT 4").all();
  let n = 0; const fails = [];
  for (const p of results) {
    try { const kws = await topKeywords(env, p.category + ' ' + p.name, 2); const t = await improveProduct(env, p, kws); n++; await note(env, 'product_copy', 'action', `Rewrote description: #${p.id} ${p.name.slice(0, 50)}`, t); }
    catch (e) { fails.push(`#${p.id}: ${e.message}`); }
  }
  if (fails.length) await note(env, 'product_copy', 'warn', `${fails.length} description(s) not written`, fails.join('\n'));
  return { summary: `${n} description(s) rewritten.`, quiet: true };
}

const stageLog = async (env, skill, who, n, extra) => { if (n) await note(env, skill, 'action', `${who}: handled ${n} post(s)`, extra || null); return { summary: `${n} post(s) handled.`, quiet: true }; };
async function pipe(env, skill, who, fn) { const n = await fn(env, 3); return stageLog(env, skill, who, n); }
async function managerSkill(env) {
  const before = (await env.DB.prepare("SELECT COUNT(*) n FROM social_posts WHERE stage='approved'").first()).n;
  const n = await managerDesk(env, 3);
  const after = (await env.DB.prepare("SELECT COUNT(*) n FROM social_posts WHERE stage='approved'").first()).n;
  const rej = (await env.DB.prepare("SELECT title, review_json FROM social_posts WHERE stage='rejected' AND created_at > datetime('now','-1 day') ORDER BY id DESC LIMIT 5").all()).results;
  const sn = await safetyNet(env);
  if (n) await note(env, 'social_manager', 'action', `Manager reviewed ${n} post(s): ${after - before} approved and scheduled`, null);
  if (sn.held.length) await note(env, 'social_manager', 'alert', `Safety check held ${sn.held.length} upcoming post(s)`, sn.held.join('\n'));
  if (rej.length && n) await note(env, 'social_manager', 'warn', `${rej.length} post(s) dropped by the team (last 24h)`, rej.map((r) => { const v = JSON.parse(r.review_json || '{}'); return r.title + ': ' + ((v.visual && !v.visual.ok ? 'visual: ' + v.visual.notes.join(', ') : '') || (v.manager && v.manager.feedback) || 'n/a'); }).join('\n'));
  return { summary: `${n} reviewed.`, quiet: true };
}

const RUN = { social_research: (e) => pipe(e, 'social_research', 'Research team', researchDesk), social_visual: (e) => pipe(e, 'social_visual', 'Visual expert', visualDesk), social_writer: (e) => pipe(e, 'social_writer', 'Content writer', writerDesk), social_manager: managerSkill, content_writer: contentWriter, product_copy: productCopy, keyword_research: keywordSkill, cj_orders: cjOrders, order_watch: orderWatch, social_fill: socialFill, seo_health: seoHealth, content_review: contentReview, daily_report: dailyReport };

// Runs every skill that is switched on and due. Safe to call often: each skill has its own interval, and only one run goes at a time.
export async function runAgent(env, { only, force } = {}) {
  const now = Date.now();
  const got = await env.DB.prepare("INSERT INTO settings (key,value) VALUES ('agent_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER) < ?").bind(String(now), now - 240000).run();
  if (!got.meta || got.meta.changes < 1) return { ran: [], note: 'busy' };
  const ran = []; let budget = 45;
  try {
    const st = await agentState(env);
    for (const sk of SKILLS) {
      if (sk.locked || !RUN[sk.id] || (only && only !== sk.id) || (!only && !st.on[sk.id])) continue;
      const last = st.last[sk.id] || 0;
      if (!force && now - last < sk.everyMin * 60000) continue;
      if (!force && sk.hourIst !== undefined && istHour() < sk.hourIst) continue;
      const cost = sk.cost ?? 3; if (!force && cost > budget) continue; budget -= cost;
      st.last[sk.id] = now;
      try { const r = await RUN[sk.id](env, st); ran.push({ skill: sk.id, ...r }); if (!r.quiet) await note(env, sk.id, 'info', r.summary, null).catch(() => {}); }
      catch (e) { ran.push({ skill: sk.id, error: String(e.message || e) }); await note(env, sk.id, 'alert', `${sk.title} failed`, String(e.message || e)).catch(() => {}); }
    }
    await saveState(env, st);
  } finally { await env.DB.prepare("UPDATE settings SET value='0' WHERE key='agent_lock'").run().catch(() => {}); }
  return { ran };
}

// Cheap check used by site visits and the schedule: at most every 5 minutes, run what is due.
export async function maybeRunAgent(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key='agent_tick'").first();
    if (row && Date.now() - Number(row.value) < 300000) return;
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('agent_tick',?)").bind(String(Date.now())).run();
    await runAgent(env);
  } catch {}
}
