// CJ order helpers shared by the admin screen and the agent: send a paid order to CJ, and pull tracking/status back.
import { cj, getCjConfig, freightToIndia } from './cj.js';
const log = (env, ref, text) => env.DB.prepare('INSERT INTO order_events (order_ref, text) VALUES (?, ?)').bind(ref, text).run();
const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// Returns {ok, cjOrderId, shipping} or {error, status}. The CJ order is created unpaid; paying it stays a manual step in CJ.
export async function pushOrder(env, ref) {
  const cfg = await getCjConfig(env);
      const o = await env.DB.prepare('SELECT * FROM orders WHERE order_ref=?').bind(ref).first();
      if (!o) return { error: 'Order not found.', status: 404 };
      if (o.status !== 'paid') return { error: 'Only paid orders can be sent to CJ.', status: 400 };
      if (o.cj_order_id) return { error: 'Already sent to CJ (' + o.cj_order_id + ').', status: 409 };
      let items = []; try { items = JSON.parse(o.items_json); } catch {}
      const lines = [];
      for (const it of items) {
        const p = await env.DB.prepare('SELECT cj_vid, cj_cost_usd, name FROM products WHERE id=?').bind(it.id).first();
        if (!p?.cj_vid) return { error: `"${it.name}" is not a CJ product, so it can't be sent to CJ automatically.`, status: 400 };
        lines.push({ vid: p.cj_vid, quantity: it.qty, usd: p.cj_cost_usd || 0 });
      }
      const fr = await freightToIndia(env, cfg, lines, o.pincode);
      if (!fr) return { error: 'CJ has no shipping line to India for these items right now.', status: 502 };
      const data = await cj(env, 'POST', '/shopping/order/createOrderV2', { body: {
        orderNumber: o.order_ref, shippingCountryCode: 'IN', shippingCountry: 'India', shippingProvince: o.state, shippingCity: o.city,
        shippingZip: o.pincode, shippingCustomerName: o.customer_name, shippingPhone: o.phone, shippingAddress: o.address, email: o.email,
        logisticName: fr.name, fromCountryCode: 'CN', payType: 3, remark: 'WinkCasa dropship order',
        products: lines.map((l) => ({ vid: l.vid, quantity: l.quantity })),
      } });
      const cjId = String(data?.orderId || '');
      if (!cjId) return { error: 'CJ did not return an order id.', status: 502 };
      const costPaise = Math.round(((Number(data.orderAmount) || lines.reduce((s, l) => s + l.usd * l.quantity, 0)) * cfg.fx * (1 + cfg.fxBufferPct / 100)) * 100);
      await env.DB.prepare(`UPDATE orders SET cj_order_id=?, supplier_name='CJ Dropshipping', supplier_order_ref=?, fulfilment_status=CASE WHEN fulfilment_status='new' THEN 'ordered' ELSE fulfilment_status END,
        supplier_cost_paise=CASE WHEN supplier_cost_paise=0 THEN ? ELSE supplier_cost_paise END, courier=COALESCE(courier, ?) WHERE order_ref=?`)
        .bind(cjId, cjId, costPaise, fr.name, o.order_ref).run();
      await log(env, o.order_ref, `Sent to CJ (order ${cjId}, ${fr.name}${fr.days ? ', ' + fr.days + ' days' : ''}). It is created unpaid: pay it in CJ → Orders → Waiting for payment.`);
      return { ok: true, cjOrderId: cjId, shipping: fr.name };
}

export async function syncOrders(env) {
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
      return { ok: true, checked: results.length, changed };
}
