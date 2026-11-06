// Keyword research agent: finds what shoppers in India actually type (Google and Amazon.in search suggestions),
// keeps the ones that fit WinkCasa's catalogue, scores them, and marks which already have a page and which are gaps.
// The other agent skills (social posts, blog, SEO) read from this table.
const BASE_SEEDS = ['earrings', 'earrings for women', 'jhumka', 'stud earrings', 'hoop earrings', 'pearl earrings', 'necklace', 'choker necklace', 'pendant', 'bracelet', 'anklet', 'ring',
  'jewellery set', 'artificial jewellery', 'claw clip', 'hair clip', 'hair accessories', 'scrunchie', 'headband', 'hair band', 'makeup brush set', 'face roller', 'gua sha', 'eyelash curler',
  'nail stickers', 'press on nails', 'dress for women', 'midi dress', 'maxi dress', 'summer dress', 'kurti', 'potli bag', 'lantern', 'diya', 'string lights', 'diwali decoration', 'rangoli'];
const CORE = /(earring|jhumka|jhumki|stud|hoop|necklace|choker|pendant|chain|bracelet|bangle|anklet|payal|\bring|jewel|mangalsutra|nose pin|hair|clip|claw|scrunch|headband|hairband|bun|ponytail|brush|makeup|roller|gua sha|massager|lash|curler|nail|dress|kurti|kurta|gown|saree|dupatta|lehenga|potli|clutch|handbag|sling|lantern|diya|light|decor|rangoli|torana|garland|candle)/i;
const BLOCK = /\b(amazon|flipkart|myntra|nykaa|meesho|ajio|tanishq|malabar|kalyan|joyalukkas|pandora|swarovski|zara|h&m|shein|apple|samsung|men|mens|man|boys?|kids?|baby|babies|girls? name|wholesale|manufacturer|supplier|near me|lyrics|song|video|movie|photo|image|wallpaper|drawing|painting|tattoo|gold rate|silver rate|price list|real gold|hallmark|diamond|platinum|surgery|piercing gun|infection|repair|job|salary|course|diy|tutorial|how to make)\b/i;
const BUY = /\b(buy|online|price|under|below|cheap|best|set|combo|pack|gift|offer|sale|india|for women|for girls|for wedding|for party|for daily|with price|affordable|latest|new|designs?)\b/i;
const QUESTION = /^(how|what|which|why|can|should|is|are|best|top|where)\b/i;

const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9&' -]/g, ' ').replace(/\s+/g, ' ').trim();
export const keepKeyword = (k) => { const w = k.split(' ').length; return k.length >= 5 && k.length <= 70 && w >= 2 && w <= 7 && CORE.test(k) && !BLOCK.test(k); };

async function suggestGoogle(q) {
  try { const r = await fetch('https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=' + encodeURIComponent(q), { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) return []; const j = await r.json(); return Array.isArray(j[1]) ? j[1] : []; } catch { return []; }
}
async function suggestAmazon(q) {
  try { const r = await fetch('https://completion.amazon.com/api/2017/suggestions?mid=A21TJRUUN4KGV&alias=aps&limit=10&prefix=' + encodeURIComponent(q)); if (!r.ok) return []; const j = await r.json(); return (j.suggestions || []).map((x) => x.value); } catch { return []; }
}

const tokens = (s) => new Set(clean(s).replace(/\b(for|women|womens|and|the|a|of|with|set|online|in|india|best)\b/g, ' ').split(' ').filter((t) => t.length > 2).map((t) => t.replace(/s$/, '')));
const overlap = (a, b) => { if (!a.size) return 0; let n = 0; for (const t of a) if (b.has(t)) n++; return n / a.size; };

export async function keywordResearch(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='kw_cursor'").first(); const cur = row ? Number(row.value) || 0 : 0;
  const cats = (await env.DB.prepare("SELECT DISTINCT category FROM products WHERE active=1").all()).results.map((r) => clean(r.category)).filter((c) => c.length > 3 && c.length < 30);
  const seeds = [...new Set([...BASE_SEEDS, ...cats])];
  const SEEDS_PER_RUN = 5, picks = []; for (let i = 0; i < SEEDS_PER_RUN; i++) picks.push(seeds[(cur + i) % seeds.length]);
  const letters = 'abcdefghijklmnopqrstuvwxyz'; const L = (n) => [0, 1, 2, 3].map((i) => letters[(cur * 3 + n * 4 + i) % 26]);
  const found = new Map(); const add = (kw, rank, src, seed) => {
    const k = clean(kw); if (!keepKeyword(k)) return;
    const f = found.get(k) || { score: 0, src: new Set(), seed };
    f.score += Math.max(1, 10 - rank) + (BUY.test(k) ? 3 : 0); f.src.add(src); found.set(k, f);
  };
  let calls = 0;
  for (let n = 0; n < picks.length; n++) {
    const seed = picks[n];
    const qs = [seed, ...L(n).map((l) => seed + ' ' + l)];
    for (const q of qs) { (await suggestGoogle(q)).forEach((s, i) => add(s, i, 'google', seed)); calls++; }
    (await suggestAmazon(seed)).forEach((s, i) => add(s, i, 'amazon', seed)); calls++;
    (await suggestAmazon(seed + ' for women')).forEach((s, i) => add(s, i, 'amazon', seed)); calls++;
  }
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('kw_cursor',?)").bind(String((cur + SEEDS_PER_RUN) % seeds.length)).run();
  // what the shop already covers: product names, focus keywords and category pages
  const prods = (await env.DB.prepare("SELECT id,name,category,focus_keyword FROM products WHERE active=1").all()).results;
  const pages = prods.flatMap((p) => [[p.name, '/p/' + p.id], [p.focus_keyword, '/p/' + p.id], [p.category, '/c/' + clean(p.category).replace(/ /g, '-')]]).filter(([t]) => t).map(([t, u]) => [tokens(t), u]);
  const stmts = []; let fresh = 0;
  const have = new Set((await env.DB.prepare('SELECT kw FROM keywords').all()).results.map((r) => r.kw));
  for (const [kw, f] of found) {
    const t = tokens(kw); let best = 0, page = null; for (const [pt, u] of pages) { const o = Math.min(overlap(t, pt), overlap(pt, t) + 0.15); if (o > best) { best = o; page = u; } }
    const covered = best >= 0.8 ? 1 : 0;
    const intent = QUESTION.test(kw) ? 'question' : BUY.test(kw) ? 'buy' : 'browse';
    if (!have.has(kw)) fresh++;
    stmts.push(env.DB.prepare("INSERT INTO keywords (kw,category,intent,score,sources,covered,page) VALUES (?,?,?,?,?,?,?) ON CONFLICT(kw) DO UPDATE SET score=MAX(score,excluded.score), hits=hits+1, sources=excluded.sources, covered=excluded.covered, page=excluded.page, last_seen=datetime('now')")
      .bind(kw, f.seed, intent, f.score, [...f.src].join('+'), covered, covered ? page : null));
  }
  for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
  return { seeds: picks, calls, found: found.size, fresh };
}

export async function topKeywords(env, category, n = 3) {
  const rows = (await env.DB.prepare("SELECT kw FROM keywords WHERE intent!='question' AND score>=8 ORDER BY (category LIKE ?) DESC, score DESC LIMIT ?").bind('%' + String(category || '').split(' ')[0].toLowerCase() + '%', n).all()).results;
  return rows.map((r) => r.kw);
}
export async function keywordSummary(env) {
  const one = async (s) => (await env.DB.prepare(s).first()).n;
  const total = await one('SELECT COUNT(*) n FROM keywords'), gaps = await one('SELECT COUNT(*) n FROM keywords WHERE covered=0'), buy = await one("SELECT COUNT(*) n FROM keywords WHERE covered=0 AND intent='buy'");
  const top = (await env.DB.prepare("SELECT kw,category,intent,score,sources FROM keywords WHERE covered=0 AND intent!='question' ORDER BY score DESC LIMIT 40").all()).results;
  const questions = (await env.DB.prepare("SELECT kw,category,score FROM keywords WHERE intent='question' ORDER BY score DESC LIMIT 15").all()).results;
  const won = (await env.DB.prepare("SELECT kw,page,score FROM keywords WHERE covered=1 ORDER BY score DESC LIMIT 10").all()).results;
  return { total, gaps, buy, top, questions, covered: won };
}
