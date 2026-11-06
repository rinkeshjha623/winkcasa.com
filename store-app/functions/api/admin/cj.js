import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { pushOrder, syncOrders } from '../../../src/cj-orders.js';
import { autoStatus, setAutoEnabled, cjTick } from '../../../src/cj-auto.js';
import { cj, getCjConfig, landedInr, priceFor, marginFor, freightToIndia, usdOf, cleanText } from '../../../src/cj.js';

const fail = (e) => json({ error: e.message || 'CJ request failed.' }, e.code === 'nokey' ? 503 : 502);
const log = (env, ref, text) => env.DB.prepare('INSERT INTO order_events (order_ref, text) VALUES (?, ?)').bind(ref, text).run();
const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  const u = new URL(request.url); const action = u.searchParams.get('action') || 'status';
  try {
    const cfg = await getCjConfig(env);
    if (action === 'status') return json({ connected: !!env.CJ_API_KEY, config: cfg });
    if (action === 'auto') return json(await autoStatus(env));
    if (action === 'search') {
      const data = await cj(env, 'GET', '/product/listV2', { query: { keyWord: u.searchParams.get('q') || '', page: u.searchParams.get('page') || 1, size: 20 } });
      const list = (data?.content || []).flatMap((c) => c.productList || []).map((p) => ({
        pid: p.id, name: p.nameEn, image: p.bigImage, usd: usdOf(p.nowPrice ?? p.sellPrice), sku: p.sku, stock: p.warehouseInventoryNum,
      }));
      return json({ list, total: data?.totalRecords || 0 });
    }
    if (action === 'product') {
      const d = await cj(env, 'GET', '/product/query', { query: { pid: u.searchParams.get('pid') } });
      return json({ pid: d.pid, name: d.productNameEn, image: d.bigImage, variants: (d.variants || []).map((v) => ({ vid: v.vid, name: v.variantNameEn, usd: usdOf(v.variantSellPrice), image: v.variantImage })) });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) { return fail(e); }
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  try {
    const cfg = await getCjConfig(env);

    if (b.action === 'auto') { await setAutoEnabled(env, !!b.enabled); return json({ ok: true, ...(await autoStatus(env)) }); }
    if (b.action === 'auto_run') { const r = await cjTick(env, { force: true }); return json({ ...r, ...(await autoStatus(env)) }); }

    if (b.action === 'config') {
      const c = b.config || {};
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('cj_config', ?)").bind(JSON.stringify(c)).run();
      return json({ ok: true, config: await getCjConfig(env) });
    }

    if (b.action === 'import') {
      const d = await cj(env, 'GET', '/product/query', { query: { pid: b.pid } });
      const variants = d.variants || [];
      const v = variants.find((x) => x.vid === b.vid) || variants[0];
      if (!v) return json({ error: 'This CJ product has no purchasable variant.' }, 400);
      const usd = usdOf(v.variantSellPrice) || usdOf(d.sellPrice);
      const category = String(b.category || 'Skincare').trim().slice(0, 40);
      const fr = await freightToIndia(env, cfg, [{ vid: v.vid, quantity: 1 }]);
      const costInr = landedInr(cfg, usd, fr?.inr);
      const margin = b.margin ? Number(b.margin) : undefined;
      const { price, mrp } = priceFor(cfg, category, costInr, margin);
      const imgs = [d.bigImage, ...String(d.productImage || '').split(',')].concat(v.variantImage ? [v.variantImage] : [])
        .map((x) => String(x || '').trim()).filter((x) => /^https:\/\//.test(x));
      const images = [...new Set(imgs)].slice(0, 6);
      const name = String(b.name || d.productNameEn).trim().slice(0, 100);
      const desc = cleanText(d.description, 3000);
      const exist = await env.DB.prepare('SELECT id FROM products WHERE cj_vid=?').bind(v.vid).first();
      if (exist) return json({ error: 'Already imported (product #' + exist.id + ').' }, 409);
      const max = (await env.DB.prepare('SELECT COALESCE(MAX(sort),0) m FROM products').first()).m;
      const r = await env.DB.prepare(`INSERT INTO products (name,category,price,mrp,description,images_json,active,sort,supplier,cost,details,cj_pid,cj_vid,cj_cost_usd,cj_ship_inr)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(name, category, price, mrp, cleanText(d.description, 200), JSON.stringify(images), b.live ? 1 : 0, max + 1, 'CJ Dropshipping', costInr, desc || null,
          d.pid, v.vid, usd, fr?.inr ?? null).run();
      return json({ ok: true, id: r.meta.last_row_id, price, mrp, costInr, shipInr: fr?.inr ?? null, shipName: fr?.name || null, usd, hidden: !b.live });
    }

    if (b.action === 'hide_placeholders') {
      const r = await env.DB.prepare("UPDATE products SET active=0 WHERE cj_vid IS NULL AND active=1").run();
      return json({ ok: true, hidden: r.meta.changes });
    }

    if (b.action === 'reprice') {
      const { results } = await env.DB.prepare('SELECT id, category, cj_cost_usd, cj_ship_inr FROM products WHERE cj_vid IS NOT NULL AND cj_cost_usd IS NOT NULL').all();
      let n = 0;
      for (const p of results) {
        const costInr = landedInr(cfg, p.cj_cost_usd, p.cj_ship_inr ?? undefined);
        const { price, mrp } = priceFor(cfg, p.category, costInr);
        await env.DB.prepare("UPDATE products SET price=?, mrp=?, cost=?, updated_at=datetime('now') WHERE id=?").bind(price, mrp, costInr, p.id).run();
        n++;
      }
      return json({ ok: true, updated: n });
    }

    if (b.action === 'push') { const r = await pushOrder(env, b.ref); return json(r.error ? { error: r.error } : r, r.status || 200); }
    if (b.action === 'sync') return json(await syncOrders(env));
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) { return fail(e); }
}
