import { json } from '../../../src/lib.js';
import { requireAdmin, FULFILMENT } from '../../../src/admin.js';

const t = (v, n) => String(v ?? '').trim().slice(0, n);
const paise = (v) => Math.max(0, Math.round(Number(v || 0) * 100));

// POST /api/admin/update  { ref, fulfilment_status?, courier?, tracking_number?, supplier_name?,
//   supplier_order_ref?, supplier_cost?, notes?, refund_status?, refunded_amount?, note? }
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_ref=?').bind(b.ref).first();
  if (!o) return json({ error: 'Order not found.' }, 404);

  const sets = []; const vals = []; const log = [];
  const set = (col, val) => { sets.push(col + '=?'); vals.push(val); };

  if (b.fulfilment_status !== undefined && b.fulfilment_status !== o.fulfilment_status) {
    if (!FULFILMENT.includes(b.fulfilment_status)) return json({ error: 'Invalid status.' }, 400);
    if (o.status !== 'paid' && b.fulfilment_status !== 'cancelled') {
      return json({ error: 'Only paid orders can be fulfilled.' }, 400);
    }
    set('fulfilment_status', b.fulfilment_status);
    if (b.fulfilment_status === 'shipped') set('shipped_at', new Date().toISOString().slice(0, 19).replace('T', ' '));
    if (b.fulfilment_status === 'delivered') set('delivered_at', new Date().toISOString().slice(0, 19).replace('T', ' '));
    log.push('Status: ' + o.fulfilment_status + ' → ' + b.fulfilment_status);
  }
  const text = { supplier_name: 80, supplier_order_ref: 80, courier: 40, tracking_number: 60, notes: 1000 };
  for (const [k, n] of Object.entries(text)) {
    if (b[k] !== undefined && t(b[k], n) !== (o[k] || '')) {
      set(k, t(b[k], n) || null);
      if (k === 'tracking_number') log.push('Tracking: ' + t(b[k], n));
      if (k === 'supplier_order_ref') log.push('Supplier order: ' + t(b[k], n));
    }
  }
  if (b.supplier_cost !== undefined && paise(b.supplier_cost) !== o.supplier_cost_paise) {
    set('supplier_cost_paise', paise(b.supplier_cost));
    log.push('Supplier cost: ₹' + (paise(b.supplier_cost) / 100));
  }
  if (b.refund_status !== undefined && ['none', 'partial', 'refunded'].includes(b.refund_status)
      && b.refund_status !== o.refund_status) {
    set('refund_status', b.refund_status);
    const amt = b.refund_status === 'refunded' ? o.total_paise : paise(b.refunded_amount);
    set('refunded_paise', b.refund_status === 'none' ? 0 : amt);
    log.push('Refund: ' + b.refund_status + (amt ? ' ₹' + amt / 100 : ''));
  }
  if (b.note) log.push('Note: ' + t(b.note, 300));

  if (sets.length) await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE order_ref=?`).bind(...vals, b.ref).run();
  for (const text of log) {
    await env.DB.prepare('INSERT INTO order_events (order_ref, text) VALUES (?, ?)').bind(b.ref, text).run();
  }
  return json({ ok: true });
}
