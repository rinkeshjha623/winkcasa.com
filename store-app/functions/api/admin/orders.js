import { json } from '../../../src/lib.js';
import { requireAdmin, parseRow } from '../../../src/admin.js';

// GET /api/admin/orders?status=paid&fulfilment=new&q=text&limit=300
// GET /api/admin/orders?ref=WC-XXXX   (single order with timeline)
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const u = new URL(request.url);

  const ref = u.searchParams.get('ref');
  if (ref) {
    const row = await env.DB.prepare('SELECT * FROM orders WHERE order_ref=?').bind(ref).first();
    if (!row) return json({ error: 'Order not found.' }, 404);
    const { results } = await env.DB.prepare('SELECT text, at FROM order_events WHERE order_ref=? ORDER BY id DESC').bind(ref).all();
    return json({ ...parseRow(row), events: results });
  }

  const where = []; const args = [];
  const status = u.searchParams.get('status');
  const ful = u.searchParams.get('fulfilment');
  const q = (u.searchParams.get('q') || '').trim();
  if (status) { where.push('status=?'); args.push(status); }
  if (ful) { where.push('fulfilment_status=?'); args.push(ful); }
  if (q) {
    where.push('(order_ref LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR email LIKE ? OR tracking_number LIKE ? OR pincode LIKE ?)');
    const like = '%' + q + '%';
    args.push(like, like, like, like, like, like);
  }
  const limit = Math.min(Number(u.searchParams.get('limit')) || 300, 1000);
  const sql = `SELECT * FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${limit}`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json(results.map(parseRow));
}
