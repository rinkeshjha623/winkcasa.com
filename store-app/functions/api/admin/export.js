import { requireAdmin, parseRow } from '../../../src/admin.js';

const esc = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return '"' + s.replace(/"/g, '""') + '"';
};

// GET /api/admin/export  -> CSV of all orders (for accounting / GST filing)
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5000').all();
  const head = ['Order', 'Created (UTC)', 'Paid (UTC)', 'Payment', 'Fulfilment', 'Customer', 'Phone', 'Email', 'Address', 'City', 'State',
    'Pincode', 'Items', 'Subtotal INR', 'Shipping INR', 'Total INR', 'Supplier', 'Supplier order', 'Supplier cost INR', 'Courier',
    'Tracking', 'Shipped (UTC)', 'Delivered (UTC)', 'Refund', 'Refunded INR', 'Razorpay payment', 'Notes'];
  const rows = results.map(parseRow).map((o) => [
    o.order_ref, o.created_at, o.paid_at, o.status, o.fulfilment_status, o.customer_name, o.phone, o.email, o.address, o.city, o.state,
    o.pincode, o.items.map((i) => i.qty + ' x ' + i.name).join('; '), o.subtotal_paise / 100, o.shipping_paise / 100, o.total_paise / 100,
    o.supplier_name, o.supplier_order_ref, o.supplier_cost_paise / 100, o.courier, o.tracking_number, o.shipped_at, o.delivered_at,
    o.refund_status, o.refunded_paise / 100, o.payment_id, o.notes,
  ].map(esc).join(','));
  return new Response([head.map(esc).join(','), ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="winkcasa-orders.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
