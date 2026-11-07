// The social team. A post made by the planner moves through four desks and is only scheduled once the manager approves it:
//   research (keywords + topic) -> visual (image/video/graphics check) -> writing (caption + pin text) -> review (manager) -> scheduled
// Posts made by hand skip all of this. Every desk writes what it decided into the post (review_json) and the agent log.
import { claude, hasKey } from './writer.js';
import { topKeywords } from './keywords.js';
import { dims, b64, makeGraphic, makeSocialText, socialNoMedia, upgradeBlogCovers, upgradeSocialCards } from './graphics.js';

const j = (v, d = {}) => { try { return JSON.parse(v) || d; } catch { return d; } };
const save = (env, id, f) => { const ks = Object.keys(f); return env.DB.prepare(`UPDATE social_posts SET ${ks.map((k) => k + '=?').join(',')} WHERE id=?`).bind(...ks.map((k) => (typeof f[k] === 'object' && f[k] !== null ? JSON.stringify(f[k]) : f[k])), id).run(); };
const batch = (env, stage, n) => env.DB.prepare('SELECT * FROM social_posts WHERE stage=? ORDER BY id LIMIT ?').bind(stage, n).all().then((r) => r.results);
const RISKY = /\b(cure[sd]?|guarantee[sd]?|miracle|heals?|clinically proven|100% (safe|natural|genuine|real)|real gold|pure silver|doctor)\b/i;
const verdict = (t) => { const v = /VERDICT:\s*(APPROVE|OK|REJECT)/i.exec(t); const r = /REASON:\s*(.+)/i.exec(t); return { ok: !!v && /APPROVE|OK/i.test(v[1]), reason: r ? r[1].trim().slice(0, 300) : '' }; };

// ---------- 1. Research team: keywords and topic ----------
const SEASON = [[10, 'Diwali gifting and festive looks'], [11, 'wedding season and winter party looks'], [0, 'new year outfits and gifts'], [1, 'Valentine gifting and date-night looks'], [2, 'Holi and spring styling'], [3, 'summer dresses and light everyday pieces'], [8, 'festive season and Navratri looks'], [9, 'Diwali gifting and festive looks']];
const season = () => { const m = new Date(Date.now() + 330 * 60000).getUTCMonth(); return (SEASON.find(([x]) => x === m) || [m, 'everyday styling'])[1]; };
export async function researchDesk(env, n = 3) {
  let done = 0;
  for (const p of await batch(env, 'research', n)) {
    const prod = p.product_id ? await env.DB.prepare('SELECT name,category FROM products WHERE id=?').bind(p.product_id).first() : null;
    const text = (prod ? prod.name + ' ' + prod.category : p.title);
    const rows = (await env.DB.prepare("SELECT kw,intent,score,covered FROM keywords WHERE intent!='question' ORDER BY score DESC LIMIT 600").all()).results;
    const toks = new Set(text.toLowerCase().replace(/[^a-z ]/g, ' ').split(' ').filter((t) => t.length > 3 && !/^(women|womens|girls|with|for|set|and)$/.test(t)).map((t) => t.replace(/s$/, '')));
    const hit = (k) => k.kw.split(' ').filter((w) => toks.has(w.replace(/s$/, ''))).length;
    let kws = rows.filter((k) => hit(k) >= 1).sort((a, b) => hit(b) - hit(a) || b.score - a.score).slice(0, 5).map((k) => k.kw);
    if (!kws.length) kws = await topKeywords(env, text, 4);
    const brief = { keywords: kws, primary: kws[0] || '', topic: season(), audience: 'women in India looking for everyday and occasion pieces' };
    await save(env, p.id, { brief_json: brief, stage: 'visual' }); done++;
  }
  return done;
}

// ---------- 2. Visual expert: image / video / graphics ----------
export async function visualDesk(env, n = 3) {
  let done = 0;
  for (const p of await batch(env, 'visual', n)) {
    const media = j(p.media_json, []), notes = []; let ok = true, plats = p.platforms.split(',');
    const vid = media.find((m) => m.type === 'video');
    if (vid) { const h = await fetch(vid.url, { method: 'HEAD' }).catch(() => null); if (!h || !h.ok) { ok = false; notes.push('video link does not load'); } else notes.push('video loads (content not auto-checked)'); }
    const img = media.find((m) => m.type === 'image');
    if (!img) { ok = false; notes.push('no image'); }
    else {
      const r = await fetch(img.url).catch(() => null);
      if (!r || !r.ok) { ok = false; notes.push('image does not load'); }
      else {
        const buf = await r.arrayBuffer(), d = dims(buf);
        if (!d) { ok = false; notes.push('not a readable image (JPG/PNG/WebP)'); }
        else {
          const ar = d.w / d.h; notes.push(`${d.w}x${d.h}`);
          if (Math.min(d.w, d.h) < 500) { ok = false; notes.push('too small (under 500px)'); }
          if (ar < 0.5 || ar > 2.2) { ok = false; notes.push('extreme shape'); }
          if (ok && (ar < 0.8 || ar > 1.91) && plats.includes('instagram')) { plats = plats.filter((x) => x !== 'instagram'); notes.push('shape not allowed on Instagram, Instagram dropped'); }
          if (ok && buf.byteLength < 6_000_000 && hasKey(env)) {
            const prod = p.product_id ? await env.DB.prepare('SELECT name FROM products WHERE id=?').bind(p.product_id).first() : null;
            try {
              const t = await claude(env, { system: 'You are the visual quality expert of an online fashion and beauty store. Judge product photos strictly but fairly.', max: 200, image: { mime: d.mime, b64: b64(buf) },
                prompt: `Product: ${prod ? prod.name : p.title}\nIs this a clean, sharp photo that clearly shows this kind of product and is suitable for Instagram and Pinterest? REJECT if it is blurry, mostly text or graphics, a collage of unrelated items, shows another brand's logo or watermark, a person's face is the main subject with no product visible, or it does not match the product at all.\nReply exactly:\nVERDICT: OK or REJECT\nREASON: one short sentence`, });
              const v = verdict(t); notes.push('visual AI: ' + (v.ok ? 'ok' : 'rejected') + (v.reason ? ' (' + v.reason + ')' : '')); if (!v.ok) ok = false;
            } catch (e) { notes.push('visual AI skipped: ' + e.message.slice(0, 60)); }
          }
        }
      }
    }
    let media2 = media;
    if (ok && img && !j(p.brief_json).branded) {
      try { const prod0 = p.product_id ? await env.DB.prepare('SELECT name,price FROM products WHERE id=?').bind(p.product_id).first() : null; const g = prod0 ? await makeSocialText(env, img.url, { line1: prod0.name.replace(/\s+/g, ' ').slice(0, 70), line2: '₹' + Number(prod0.price).toLocaleString('en-IN') + '  ·  FREE DELIVERY ABOVE ₹999  ·  WINKCASA.COM' }) : await makeGraphic(env, img.url, 'social'); media2 = [{ url: g, type: 'image' }, ...media.filter((m) => m !== img)]; notes.push('branded WinkCasa graphic created'); await save(env, p.id, { brief_json: { ...j(p.brief_json), branded: true, original: img.url } }); }
      catch (e) { notes.push('branding skipped: ' + e.message.slice(0, 120)); }
    }
    const rv = { ...j(p.review_json), visual: { ok, notes } };
    if (media2 !== media) await save(env, p.id, { media_json: media2 });
    if (ok && plats.length) await save(env, p.id, { review_json: rv, stage: 'writing', platforms: plats.join(',') });
    else await save(env, p.id, { review_json: rv, stage: 'rejected' });
    done++;
  }
  return done;
}

// ---------- 3. Content writer ----------
const WRITER_RULES = `You are the content writer of WinkCasa, an Indian online store for everyday jewellery, hair accessories, beauty tools and dresses. Write warm, clear, specific copy for Indian shoppers. Never make health claims. Never say guaranteed, miracle, real gold, pure silver or similar. Never invent materials, sizes, reviews or offers. Use only the product facts given. Free delivery above ₹999, 7-day returns are the only offers you may mention. Emojis: at most 2.`;
const hashtag = (k) => '#' + k.replace(/[^a-z0-9]/gi, '');
export async function writerDesk(env, n = 3) {
  let done = 0;
  for (const p of await batch(env, 'writing', n)) {
    const prod = p.product_id ? await env.DB.prepare('SELECT name,category,material,price FROM products WHERE id=?').bind(p.product_id).first() : null;
    const brief = j(p.brief_json), rv = j(p.review_json), name = prod ? prod.name.replace(/\s+/g, ' ').slice(0, 90) : p.title, price = prod ? '₹' + Number(prod.price).toLocaleString('en-IN') : '';
    const kws = brief.keywords || [], tags = [...new Set([...kws.slice(0, 4).map(hashtag), '#WinkCasa', '#ShopIndia'])].slice(0, 8).join(' ');
    let caption = '', pinTitle = '', pinDesc = '';
    if (hasKey(env)) {
      try {
        const fb = rv.manager && rv.manager.feedback ? `\nThe manager rejected the last version: ${rv.manager.feedback}. Fix this.` : '';
        const t = await claude(env, { system: WRITER_RULES, max: 900, prompt: `Product: ${name}\nCategory: ${prod ? prod.category : ''}\nMaterial: ${prod && prod.material ? prod.material : 'not stated'}\nPrice: ${price}\nSearch keywords to work in naturally (do not stuff): ${kws.join(', ') || 'none'}\nSeasonal angle: ${brief.topic}${fb}\nWrite:\nCAPTION: Instagram/Facebook caption, 50 to 110 words, a hook first line, one styling idea, then "${price} · Free delivery above ₹999 · winkcasa.com", then 5 to 8 hashtags including ${tags}\nPIN_TITLE: under 90 characters, starts with the main keyword\nPIN_DESC: 200 to 400 characters, natural sentences using the keywords, no hashtags\nReturn exactly those three labelled parts.` });
        const m = /CAPTION:\s*([\s\S]*?)\n\s*PIN_TITLE:\s*(.+)\n\s*PIN_DESC:\s*([\s\S]+)$/i.exec(t);
        if (m) { caption = m[1].trim(); pinTitle = m[2].trim(); pinDesc = m[3].trim(); }
      } catch (e) { rv.writer = { note: 'AI writer failed, used template: ' + e.message.slice(0, 80) }; }
    }
    if (!caption) { caption = `${name}\n\nOur pick for ${brief.topic || 'everyday styling'}.\n${price} · Free delivery above ₹999 · winkcasa.com\n\n${tags}`; pinTitle = `${kws[0] ? kws[0][0].toUpperCase() + kws[0].slice(1) + ': ' : ''}${name}`.slice(0, 90); pinDesc = `${name}. ${kws.slice(0, 2).join(', ')}. ${price}, free delivery above ₹999 at WinkCasa.`; }
    const b = { ...brief, pin_desc: pinDesc.slice(0, 480) };
    await save(env, p.id, { caption: caption.slice(0, 2200), title: (pinTitle || name).slice(0, 100), brief_json: b, review_json: rv, stage: 'review' }); done++;
  }
  return done;
}

// ---------- 4. Manager: final review, then schedule ----------
export function managerChecks(p, prod, brief) {
  const probs = [], cap = p.caption || '', plats = p.platforms.split(',');
  if (cap.length < 40) probs.push('caption too short');
  if (cap.length > 2200) probs.push('caption too long');
  if (RISKY.test(cap + ' ' + p.title + ' ' + (brief.pin_desc || ''))) probs.push('risky claim in text');
  if ((cap.match(/#\w+/g) || []).length > 15) probs.push('more than 15 hashtags');
  if (prod) { const nums = (cap.match(/₹\s?[\d,]+/g) || []).map((x) => x.replace(/[₹\s,]/g, '')); if (nums.some((x) => x !== String(prod.price) && x !== '999')) probs.push('price in caption does not match the product price'); }
  if (plats.includes('pinterest')) { if (!p.pin_board) probs.push('no Pinterest board'); if (!/^https?:\/\//.test(p.pin_link || '')) probs.push('no Pin link'); if (String(p.title).length < 15) probs.push('pin title too short'); }
  if ((cap.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length > 3) probs.push('too many emojis');
  return probs;
}
export async function managerDesk(env, n = 3) {
  let done = 0;
  for (const p of await batch(env, 'review', n)) {
    const prod = p.product_id ? await env.DB.prepare('SELECT name,price,category FROM products WHERE id=? AND active=1').bind(p.product_id).first() : null;
    const brief = j(p.brief_json), rv = j(p.review_json), round = (rv.manager && rv.manager.round) || 0;
    const probs = managerChecks(p, prod, brief);
    if (!prod && p.product_id) probs.push('product is no longer live');
    const dupe = await env.DB.prepare("SELECT 1 x FROM social_posts WHERE id!=? AND caption=? AND created_at > datetime('now','-30 days')").bind(p.id, p.caption).first(); if (dupe) probs.push('caption already used');
    let reason = '';
    if (!probs.length && hasKey(env)) {
      try { const t = await claude(env, { system: 'You are the manager of a small online store\'s social media team. You approve only copy that is accurate, honest, on-brand (warm, clear, India-focused) and uses its keywords naturally. You reject spammy, generic, or misleading text.', max: 200, prompt: `Product: ${prod.name}, ₹${prod.price}\nKeywords: ${(brief.keywords || []).join(', ')}\nCaption:\n${p.caption}\n\nPin title: ${p.title}\nPin description: ${brief.pin_desc || ''}\nReply exactly:\nVERDICT: APPROVE or REJECT\nREASON: one short sentence` }); const v = verdict(t); if (!v.ok) probs.push('manager: ' + (v.reason || 'not good enough')); else reason = v.reason; }
      catch (e) { reason = 'AI review skipped (' + e.message.slice(0, 50) + '), rule checks passed'; }
    }
    const mgr = { round: round + 1, ok: !probs.length, feedback: probs.join('; '), note: reason };
    if (!probs.length) {
      const min = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 19).replace('T', ' ');
      await save(env, p.id, { review_json: { ...rv, manager: mgr }, stage: 'approved', status: 'scheduled', scheduled_at: p.scheduled_at && p.scheduled_at > min ? p.scheduled_at : min });
    } else if (round < 1) await save(env, p.id, { review_json: { ...rv, manager: mgr }, stage: 'writing' });
    else await save(env, p.id, { review_json: { ...rv, manager: mgr }, stage: 'rejected' });
    done++;
  }
  return done;
}

// The manager also checks the other auto posts coming up in the next 24 hours (the 30-day plan, hand-made ones): safety only, it never rewrites them.
export async function safetyNet(env) {
  const rows = (await env.DB.prepare("SELECT * FROM social_posts WHERE stage IS NULL AND auto=1 AND status='scheduled' AND scheduled_at <= datetime('now','+24 hours') AND review_json IS NULL LIMIT 10").all()).results;
  const held = [];
  for (const p of rows) {
    const probs = []; if (RISKY.test(p.caption + ' ' + p.title)) probs.push('risky claim in text'); if ((p.caption.match(/#\w+/g) || []).length > 30) probs.push('over 30 hashtags');
    if (p.platforms.includes('pinterest') && (!p.pin_board || !p.pin_link)) probs.push('Pinterest board or link missing');
    if (probs.length) { held.push(`${p.title || p.id}: ${probs.join('; ')}`); await save(env, p.id, { status: 'draft', review_json: { manager: { ok: false, feedback: probs.join('; ') } } }); }
    else await save(env, p.id, { review_json: { manager: { ok: true, note: 'safety check passed' } } });
  }
  return { checked: rows.length, held };
}
export const brief = (p) => j(p.brief_json);

// Everything else the visual expert makes: covers for blog posts that have none, pictures for auto posts that have none.
export async function graphicsDesk(env) {
  const b = await upgradeBlogCovers(env, 2), c = await upgradeSocialCards(env, 2), sm = await socialNoMedia(env, 2);
  return { made: [...b.made.map((x) => 'Blog cover: ' + x), ...c.made.map((x) => 'Social card: ' + x), ...sm.made.map((x) => 'Social graphic: ' + x)], fails: [...b.fails, ...c.fails, ...sm.fails] };
}
