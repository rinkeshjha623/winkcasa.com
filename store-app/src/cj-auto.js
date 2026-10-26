// Daily CJ auto-publisher: finds NEW CJ products in the store's three categories, keeps only those with a CJ price
// under the limit (default Rs 500), real stock and a shipping line to India, and publishes 10 a day for 30 days.
// Safe to call as often as you like: it never publishes more than the daily number and only acts after 10:00 IST.
import { cj, getCjConfig, landedInr, priceFor, freightToIndia, usdOf, cleanText } from './cj.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const AUTO_DEFAULT = { enabled: true, start: '2026-10-26', days: 30, perDay: 10, maxInr: 500, minStock: 50, hourIst: 10 };
const GROUPS = [
  { category: 'Jewellery', per: 2, kws: ['earrings', 'necklace', 'bracelet', 'pendant', 'ring set', 'choker', 'anklet', 'pearl earrings', 'hoop earrings', 'bangle'] },
  { category: 'Hair & accessories', per: 2, kws: ['hair clip', 'claw clip', 'headband', 'scrunchie', 'hair pin', 'barrette', 'hair bow'] },
  { category: 'Beauty tools', per: 2, kws: ['makeup brush', 'face roller', 'eyelash curler', 'nail art stickers', 'makeup sponge', 'gua sha', 'facial massager'] },
  { category: 'Dresses & Ethnic Wear', per: 1, kws: ['kurti', 'dupatta', 'women dress', 'ethnic dress', 'scarf shawl', 'palazzo'] },
  { category: 'Bags & Potlis', per: 1, kws: ['potli bag', 'clutch bag', 'women handbag', 'sling bag women', 'evening bag'] },
  { category: 'Festive Decor', per: 2, kws: ['string lights', 'led candle', 'lantern', 'artificial flower garland', 'rangoli', 'diya', 'wall hanging decor'] },
];
// interleave the categories (jewellery, hair, beauty, jewellery, ...) so each discovery pass covers all three
const ALL_KW = []; for (let i = 0; GROUPS.some((g) => i < g.kws.length); i++) for (const g of GROUPS) if (g.kws[i]) ALL_KW.push({ kw: g.kws[i], category: g.category });
// never auto-publish anything that is not plain fashion or beauty accessories
const BLOCK = /\b(knife|knives|gun|weapon|sex|sexy|adult|vibrat\w*|lingerie|cigarette|lighter|battery|batteries|pistol|dagger|sword|drug|medical|syringe|blade|razor)\b/i;
const BLOCK2 = /\b(bluetooth|headphone\w*|earphone\w*|earbud\w*|wireless|usb|pet|dog|cat|puppy|car|phone|charger|toy|kids?|baby|doll|led|lamp|speaker|watch|beads?|diy|craft|bases|sealing|sweat\w*|sports?|body|waist|tool kit|trimmer|electric|rechargeable|nose|men|mens|shaver|comb|massage comb)\b/i;
const APPAREL_BLOCK = /\b(top|shirt|t-?shirt|pants|jeans|socks?|case|cover|hoodie|jacket|shorts|bikini|swimsuit|underwear|bra|sports?|yoga|gym)\b/i;
const bad = (name, cat) => BLOCK.test(name) || BLOCK2.test(name) || (!/Dress|Bag/.test(cat) && APPAREL_BLOCK.test(name)) || (/Dress/.test(cat) && /\b(sexy|bikini|mini|club|party dress|bodycon|swim|lingerie|pet|kids?|baby)\b/i.test(name)) || !MUST[cat].test(name);
const MUST = {
  'Dresses & Ethnic Wear': /(kurti|kurta|saree|sari|lehenga|dupatta|anarkali|ethnic|dress|gown|salwar|palazzo|sharara|stole|shawl|scarf)/i,
  'Bags & Potlis': /(potli|clutch|handbag|sling|crossbody|tote|purse|wallet|pouch|evening bag|shoulder bag)/i,
  'Festive Decor': /(diya|lantern|string light|fairy light|torana|toran|rangoli|candle|garland|wall hanging|decor|lamp|tea ?light|flower|curtain light|bunting|banner)/i,
  'Jewellery': /(earring|necklace|bracelet|pendant|ring|choker|anklet|bangle|stud|hoop|jhumka|chain|brooch|jewel)/i,
  'Hair & accessories': /(hair|clip|claw|headband|scrunchie|barrette|bow|hairpin|hairband|bun|ponytail)/i,
  'Beauty tools': /(brush|roller|curler|sponge|gua sha|massager|makeup|nail|eyelash|puff|mirror|tweezer)/i,
};
const NOISE = /\b(cross[- ]?border|amazon|explosive|hot[- ]?selling|best[- ]?selling|KP-?\d+|foreign trade|new arrival|ins style|wholesale|factory direct)\b/gi;
// CJ titles are long keyword lists: keep the part before the first comma/dash run, cut at a word boundary, drop dangling words.
export function cleanName(n) {
  let t = String(n || '').replace(NOISE, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > 70) { const c = t.slice(0, 70); const i = Math.max(c.lastIndexOf(', '), c.lastIndexOf(' ')); t = c.slice(0, i > 30 ? i : 70); }
  return t.replace(/[\s,.\-]+(for|and|with|of|in|to|a|the|on|&)$/i, '').replace(/^[\s,.\-]+|[\s,.\-]+$/g, '');
}

const ist = () => { const d = new Date(Date.now() + 19800000); return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }; };
const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const getJ = async (env, k, d) => { const r = await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(k).first(); try { return r ? { ...d, ...JSON.parse(r.value) } : d; } catch { return d; } };
const setJ = (env, k, v) => env.DB.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').bind(k, JSON.stringify(v)).run();

export async function ensureQueue(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS cj_queue (pid TEXT PRIMARY KEY, name TEXT, image TEXT, usd REAL, category TEXT, stock INTEGER, created_ms INTEGER, status TEXT NOT NULL DEFAULT \'found\', note TEXT, found_at TEXT NOT NULL DEFAULT (datetime(\'now\')), done_at TEXT)').run();
}

async function discover(env, auto, cfg, n) {
  const maxUsd = Math.round((auto.maxInr / cfg.fx) * 100) / 100;
  const st = await getJ(env, 'cj_auto_kw', { i: 0 }); let found = 0, calls = 0; const dbg = [];
  for (let k = 0; k < n; k++) {
    const { kw, category } = ALL_KW[(st.i + k) % ALL_KW.length];
    const base = { keyWord: kw, page: 1, size: 50, orderBy: 3, sort: 'desc', startSellPrice: 0.2, endSellPrice: maxUsd, startWarehouseInventory: auto.minStock };
    let list = [];
    for (const extra of [{ productFlag: 1 }, { timeStart: Date.now() - 150 * 86400000 }]) {
      await sleep(1100); calls++;
      let data; try { data = await cj(env, 'GET', '/product/listV2', { query: { ...base, ...extra } }); } catch { continue; }
      list = (data?.content || []).flatMap((c) => c.productList || []);
      if (list.length) break;
    }
    const rec = { kw, raw: list.length, bad: 0, ok: 0 }; dbg.push(rec);
    for (const p of list) {
      const name = cleanName(p.nameEn); const usd = usdOf(p.nowPrice ?? p.sellPrice);
      if (!p.id || !name || !p.bigImage || !(usd > 0) || usd > maxUsd || bad(name, category)) { rec.bad++; continue; }
      if (Number(p.warehouseInventoryNum) < auto.minStock) continue;
      const have = await env.DB.prepare('SELECT 1 x FROM products WHERE cj_pid=?').bind(p.id).first(); if (have) continue;
      const r = await env.DB.prepare('INSERT OR IGNORE INTO cj_queue (pid,name,image,usd,category,stock,created_ms) VALUES (?,?,?,?,?,?,?)')
        .bind(p.id, name, p.bigImage, usd, category, Number(p.warehouseInventoryNum) || null, Number(p.createAt) || null).run();
      found += r.meta?.changes || 0; rec.ok++;
    }
  }
  await setJ(env, 'cj_auto_kw', { i: (st.i + n) % ALL_KW.length });
  return { found, calls, dbg };
}

async function publishOne(env, auto, cfg, row) {
  const mark = (status, note) => env.DB.prepare("UPDATE cj_queue SET status=?, note=?, done_at=datetime('now') WHERE pid=?").bind(status, String(note || '').slice(0, 200), row.pid).run();
  try {
    await sleep(1100);
    const d = await cj(env, 'GET', '/product/query', { query: { pid: row.pid } });
    const v = (d.variants || []).filter((x) => usdOf(x.variantSellPrice) > 0).sort((a, b) => usdOf(a.variantSellPrice) - usdOf(b.variantSellPrice))[0];
    if (!v) { await mark('skip', 'no purchasable variant'); return null; }
    const usd = usdOf(v.variantSellPrice);
    if (usd > auto.maxInr / cfg.fx) { await mark('skip', 'variant price over the limit'); return null; }
    if (bad(String(d.productNameEn || ''), row.category)) { await mark('skip', 'blocked product type'); return null; }
    await sleep(1100);
    const fr = await freightToIndia(env, cfg, [{ vid: v.vid, quantity: 1 }]);
    if (!fr) { await mark('skip', 'no CJ shipping line to India'); return null; }
    const costInr = landedInr(cfg, usd, fr.inr);
    const { price, mrp } = priceFor(cfg, row.category, costInr);
    const imgs = [d.bigImage, ...String(d.productImage || '').split(',')].concat(v.variantImage ? [v.variantImage] : []).map((x) => String(x || '').trim()).filter((x) => /^https:\/\//.test(x));
    const images = [...new Set(imgs)].slice(0, 6); if (!images.length) { await mark('skip', 'no images'); return null; }
    if (await env.DB.prepare('SELECT 1 x FROM products WHERE cj_vid=?').bind(v.vid).first()) { await mark('skip', 'already in store'); return null; }
    const max = (await env.DB.prepare('SELECT COALESCE(MAX(sort),0) m FROM products').first()).m;
    const name = cleanName(d.productNameEn) || row.name;
    const r = await env.DB.prepare(`INSERT INTO products (name,category,price,mrp,description,images_json,active,sort,supplier,cost,details,cj_pid,cj_vid,cj_cost_usd,cj_ship_inr)
      VALUES (?,?,?,?,?,?,1,?,?,?,?,?,?,?,?)`)
      .bind(name, row.category, price, mrp, cleanText(d.description, 200), JSON.stringify(images), max + 1, 'CJ Dropshipping', costInr, cleanText(d.description, 3000) || null, d.pid, v.vid, usd, fr.inr).run();
    await mark('live', `product #${r.meta.last_row_id} at Rs ${price}`);
    return { id: r.meta.last_row_id, name, price, usd };
  } catch (e) { await mark('skip', e.message); return null; }
}

// One step of the daily job. Returns a short summary; never throws.
export async function cjTick(env, { force = false } = {}) {
  try {
    if (!env.CJ_API_KEY) return { ok: true, note: 'CJ not connected' };
    const auto = await getJ(env, 'cj_auto', AUTO_DEFAULT);
    if (!auto.enabled) return { ok: true, note: 'paused' };
    const now = ist(), last = addDays(auto.start, auto.days - 1);
    if (now.date < auto.start || now.date > last) return { ok: true, note: 'outside the 30 day window' };
    let day = await getJ(env, 'cj_auto_day', { date: '', done: 0, cat: {} });
    if (day.date !== now.date) day = { date: now.date, done: 0, cat: {} };
    if (day.done >= auto.perDay) return { ok: true, note: 'today is done', done: day.done };
    if (!force && now.hour < auto.hourIst) return { ok: true, note: `waiting for ${auto.hourIst}:00 IST` };
    // one runner at a time (90 second lease)
    const t = Date.now();
    const got = await env.DB.prepare("INSERT INTO settings (key,value) VALUES ('cj_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER) < ?").bind(String(t), t - 90000).run();
    if (!got.meta || got.meta.changes < 1) return { ok: true, note: 'busy' };
    try {
      await ensureQueue(env);
      for (const r of (await env.DB.prepare("SELECT pid,name,category FROM cj_queue WHERE status='found'").all()).results) if (!MUST[r.category] || bad(r.name, r.category)) await env.DB.prepare("UPDATE cj_queue SET status='skip', note='irrelevant' WHERE pid=?").bind(r.pid).run();
      const cfg = await getCjConfig(env);
      const out = { ok: true, published: [], skipped: 0 };
      const cnt = (await env.DB.prepare("SELECT COUNT(*) c FROM cj_queue WHERE status='found'").first()).c;
      const low = (await env.DB.prepare("SELECT COUNT(DISTINCT category) c FROM cj_queue WHERE status='found'").first()).c < GROUPS.length;
      if (cnt < 40 || low) out.discover = await discover(env, auto, cfg, low ? 2 : 1);
      for (let i = 0; i < 3 && day.done < auto.perDay; i++) {
        const quota = Object.fromEntries(GROUPS.map((g) => [g.category, g.per]));
        const open = GROUPS.map((g) => g.category).filter((c) => (day.cat[c] || 0) < quota[c]);
        let row = null;
        for (const c of open) { row = await env.DB.prepare("SELECT * FROM cj_queue WHERE status='found' AND category=? ORDER BY COALESCE(created_ms,0) DESC, rowid ASC LIMIT 1").bind(c).first(); if (row) break; }
        if (!row) row = await env.DB.prepare("SELECT * FROM cj_queue WHERE status='found' ORDER BY COALESCE(created_ms,0) DESC, rowid ASC LIMIT 1").first();
        if (!row) { out.note = 'queue empty'; break; }
        const res = await publishOne(env, auto, cfg, row);
        if (res) { day.done++; day.cat[row.category] = (day.cat[row.category] || 0) + 1; out.published.push(res); } else out.skipped++;
        await setJ(env, 'cj_auto_day', day);
      }
      await setJ(env, 'cj_auto_day', day);
      out.done = day.done; return out;
    } finally { await env.DB.prepare("UPDATE settings SET value='0' WHERE key='cj_lock'").run().catch(() => {}); }
  } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 200) }; }
}

export async function autoStatus(env) {
  await ensureQueue(env);
  const auto = await getJ(env, 'cj_auto', AUTO_DEFAULT), day = await getJ(env, 'cj_auto_day', { date: '', done: 0, cat: {} });
  const q = (await env.DB.prepare('SELECT status, COUNT(*) c FROM cj_queue GROUP BY status').all()).results;
  const live = (await env.DB.prepare("SELECT COUNT(*) c FROM cj_queue WHERE status='live'").first()).c;
  return { auto, today: ist().date === day.date ? day.done : 0, queue: Object.fromEntries(q.map((r) => [r.status, r.c])), published: live, last: addDays(auto.start, auto.days - 1) };
}
export const setAutoEnabled = async (env, enabled) => { const a = await getJ(env, 'cj_auto', AUTO_DEFAULT); a.enabled = !!enabled; await setJ(env, 'cj_auto', a); return a; };
