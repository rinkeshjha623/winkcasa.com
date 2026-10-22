import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
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

    if (b.action === 'push') {
      const o = await env.DB.prepare('SELECT * FROM orders WHERE order_ref=?').bind(b.ref).first();
      if (!o) return json({ error: 'Order not found.' }, 404);
      if (o.status !== 'paid') return json({ error: 'Only paid orders can be sent to CJ.' }, 400);
      if (o.cj_order_id) return json({ error: 'Already sent to CJ (' + o.cj_order_id + ').' }, 409);
      let items = []; try { items = JSON.parse(o.items_json); } catch {}
      const lines = [];
      for (const it of items) {
        const p = await env.DB.prepare('SELECT cj_vid, cj_cost_usd, name FROM products WHERE id=?').bind(it.id).first();
        if (!p?.cj_vid) return json({ error: `"${it.name}" is not a CJ product, so it can't be sent to CJ automatically.` }, 400);
        lines.push({ vid: p.cj_vid, quantity: it.qty, usd: p.cj_cost_usd || 0 });
      }
      const fr = await freightToIndia(env, cfg, lines, o.pincode);
      if (!fr) return json({ error: 'CJ has no shipping line to India for these items right now.' }, 502);
      const data = await cj(env, 'POST', '/shopping/order/createOrderV2', { body: {
        orderNumber: o.order_ref, shippingCountryCode: 'IN', shippingCountry: 'India', shippingProvince: o.state, shippingCity: o.city,
        shippingZip: o.pincode, shippingCustomerName: o.customer_name, shippingPhone: o.phone, shippingAddress: o.address, email: o.email,
        logisticName: fr.name, fromCountryCode: 'CN', payType: 3, remark: 'WinkCasa dropship order',
        products: lines.map((l) => ({ vid: l.vid, quantity: l.quantity })),
      } });
      const cjId = String(data?.orderId || '');
      if (!cjId) return json({ error: 'CJ did not return an order id.' }, 502);
      const costPaise = Math.round(((Number(data.orderAmount) || lines.reduce((s, l) => s + l.usd * l.quantity, 0)) * cfg.fx * (1 + cfg.fxBufferPct / 100)) * 100);
      await env.DB.prepare(`UPDATE orders SET cj_order_id=?, supplier_name='CJ Dropshipping', supplier_order_ref=?, fulfilment_status=CASE WHEN fulfilment_status='new' THEN 'ordered' ELSE fulfilment_status END,
        supplier_cost_paise=CASE WHEN supplier_cost_paise=0 THEN ? ELSE supplier_cost_paise END, courier=COALESCE(courier, ?) WHERE order_ref=?`)
        .bind(cjId, cjId, costPaise, fr.name, o.order_ref).run();
      await log(env, o.order_ref, `Sent to CJ (order ${cjId}, ${fr.name}${fr.days ? ', ' + fr.days + ' days' : ''}). It is created unpaid: pay it in CJ → Orders → Waiting for payment.`);
      return json({ ok: true, cjOrderId: cjId, shipping: fr.name });
    }

    if (b.action === 'sync') {
      const { results } = await env.DB.prepare("SELECT order_ref, cj_order_id, fulfilment_status FROM orders WHERE cj_order_id IS NOT NULL AND fulfilment_status IN ('ordered','shipped') ORDER BY id DESC LIMIT 8").all();
      let changed = 0;
      for (const o of results) {
        let data; try { data = await cj(env, 'GET', '/shopping/order/list', { query: { orderIds: o.cj_order_id, pageNum: 1, pageSize: 5 } }); } catch { continue; }
        const row = (data?.list || data?.content || [])[0]; if (!row) continue;
        const st = String(row.orderStatus || '').toUpperCase();
        const track = String(row.trackNumber || '').trim();
        const sets = []; const vals = [];
        if (track) { sets.push('tracking_number=?'); vals.push(track); }
        if (row.logisticName) { sets.push('courier=?'); vals.push(String(row.logisticName).slice(0, 40)); }
        let next = o.fulfilment_status;
        if (st === 'DELIVERED') next = 'delivered'; else if (st === 'SHIPPED' || (track && o.fulfilment_status === 'ordered')) next = 'shipped';
        if (next !== o.fulfilment_status) {
          sets.push('fulfilment_status=?'); vals.push(next);
          if (next === 'shipped') { sets.push('shipped_at=?'); vals.push(nowStr()); }
          if (next === 'delivered') { sets.push('delivered_at=?'); vals.push(nowStr()); }
        }
        if (sets.length) {
          await env.DB.prepare(`UPDATE orders SET ${sets.join(',')} WHERE order_ref=?`).bind(...vals, o.order_ref).run();
          await log(env, o.order_ref, `CJ update: ${st || 'status'}${track ? ', tracking ' + track : ''}`);
          changed++;
        }
      }
      return json({ ok: true, checked: results.length, changed });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) { return fail(e); }
}
