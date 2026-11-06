// Writing skills that use Claude through the Anthropic API (key stored as the ANTHROPIC_API_KEY secret on Cloudflare, never in code or the browser).
import { slugify } from './store.js';

export const hasKey = (env) => !!env.ANTHROPIC_API_KEY;
export async function claude(env, { system, prompt, max = 3500 }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set on the server.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: max, system, messages: [{ role: 'user', content: prompt }] }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Claude API: ' + (j.error?.message || r.status));
  return (j.content || []).map((c) => c.text || '').join('').trim();
}

const RULES = `You write for WinkCasa, an Indian online store (winkcasa.com) selling everyday jewellery, hair accessories, beauty tools, dresses and festive decor. Voice: warm, clear, practical, plain English for Indian shoppers.
Hard rules: never make medical or health claims; never say guaranteed, miracle, clinically proven, 100% safe or similar; never invent statistics, reviews, awards, materials, sizes or certifications; only describe a product using the facts given. Prices are in rupees. Free delivery above ₹999, 7-day returns, delivery in 10 to 20 days. No emojis. No filler openings.`;

const field = (t, name) => { const m = new RegExp('^' + name + ':\\s*(.+)$', 'mi').exec(t); return m ? m[1].trim() : ''; };

// One blog draft for one keyword. Saved unpublished: the review skill decides whether it can go live.
export async function writePost(env, kw) {
  const links = (await env.DB.prepare("SELECT id,name,category FROM products WHERE active=1 AND noindex=0 ORDER BY (LOWER(name||' '||category) LIKE ?) DESC, id DESC LIMIT 8").bind('%' + kw.kw.split(' ')[0] + '%').all()).results;
  const cats = (await env.DB.prepare('SELECT DISTINCT category FROM products WHERE active=1 LIMIT 12').all()).results.map((c) => `/c/${slugify(c.category)} (${c.category})`);
  const prompt = `Write a helpful blog article for the search keyword: "${kw.kw}" (${kw.intent} intent).
Length: 750 to 1000 words. Use 4 to 6 "## " section headings, short paragraphs and one bullet list. Put the keyword naturally in the title and the first paragraph.
Link to our pages with markdown links where they fit (at least 2 links), using only these real pages:
Products: ${links.map((p) => `[${p.name.slice(0, 60)}](/p/${p.id}-${slugify(p.name)})`).join('; ') || 'none'}
Categories: ${cats.join('; ')}
Return exactly this format and nothing else:
TITLE: (30 to 65 characters)
EXCERPT: (110 to 160 characters)
---BODY---
(the article in markdown, without repeating the title)`;
  const out = await claude(env, { system: RULES, prompt, max: 3500 });
  const [head, ...rest] = out.split('---BODY---'); const body = rest.join('---BODY---').trim();
  const title = field(head, 'TITLE').replace(/^["*]+|["*]+$/g, ''), excerpt = field(head, 'EXCERPT');
  if (!title || !body) throw new Error('Claude returned an unexpected format.');
  let slug = slugify(title).slice(0, 70) || slugify(kw.kw); if (await env.DB.prepare('SELECT 1 x FROM posts WHERE slug=?').bind(slug).first()) slug += '-' + Date.now().toString(36).slice(-4);
  await env.DB.prepare("INSERT INTO posts (slug,title,excerpt,body,author,published,focus_kw) VALUES (?,?,?,?,?,0,?)").bind(slug, title.slice(0, 120), excerpt.slice(0, 300), body, 'WinkCasa Team', kw.kw).run();
  await env.DB.prepare("UPDATE keywords SET status='targeted' WHERE kw=?").bind(kw.kw).run();
  return { title, slug, words: body.split(/\s+/).length };
}

// Thin product descriptions, rewritten from the product's own facts only.
export async function improveProduct(env, p, kws) {
  const prompt = `Rewrite the product description for this item. Facts you may use (nothing else): name: ${p.name}; category: ${p.category}; material: ${p.material || 'not stated'}; price: ₹${p.price}.
Write 2 short paragraphs (60 to 110 words total) plus one line on styling ideas. Do not state sizes, weight, plating, stones or care instructions unless given above. Work in one of these search phrases only if it fits naturally: ${kws.join(', ') || 'none'}.
Return the description text only.`;
  const text = await claude(env, { system: RULES, prompt, max: 500 });
  if (text.length < 80 || text.length > 1200 || /guarantee|miracle|clinically/i.test(text)) throw new Error('Rejected: description failed checks.');
  await env.DB.prepare("UPDATE products SET description=?, updated_at=datetime('now') WHERE id=?").bind(text, p.id).run();
  return text;
}
