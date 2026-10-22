import { json } from '../../../src/lib.js';
import { requireAdmin, parseRow, feePaise } from '../../../src/admin.js';

const IST = 5.5 * 3600 * 1000;
const istDay = (utcStr) => new Date(new Date(utcStr.replace(' ', 'T') + 'Z').getTime() + IST).toISOString().slice(0, 10);

// GET /api/admin/stats?days=30
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days')) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');

  const { results: paidRows } = await env.DB.prepare(
    "SELECT * FROM orders WHERE status='paid' AND paid_at >= ? ORDER BY paid_at DESC LIMIT 5000").bind(since).all();
  const paid = paidRows.map(parseRow).filter((o) => o.fulfilment_status !== 'cancelled');
  const abandoned = (await env.DB.prepare(
    "SELECT COUNT(*) n FROM orders WHERE status='created' AND created_at >= ?").bind(since).first()).n;

  const sum = (arr, f) => arr.reduce((a, o) => a + f(o), 0);
  const gross = sum(paid, (o) => o.total_paise);
  const refunds = sum(paid, (o) => o.refunded_paise);
  const net = gross - refunds;
  const costed = paid.filter((o) => o.supplier_cost_paise > 0);
  const cogs = sum(costed, (o) => o.supplier_cost_paise);
  const fees = sum(paid, (o) => feePaise(o.total_paise));
  const profitBase = sum(costed, (o) => o.total_paise - o.refunded_paise);
  const profit = profitBase - cogs - sum(costed, (o) => feePaise(o.total_paise));

  // revenue per day (IST), filled for every day in range
  const byDay = {};
  for (const o of paid) {
    const d = istDay(o.paid_at);
    (byDay[d] ||= { orders: 0, revenue: 0 });
    byDay[d].orders++; byDay[d].revenue += o.total_paise;
  }
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() + IST - i * 86400000).toISOString().slice(0, 10);
    daily.push({ day: d, ...(byDay[d] || { orders: 0, revenue: 0 }) });
  }

  const products = {};
  for (const o of paid) for (const l of o.items) {
    (products[l.name] ||= { name: l.name, units: 0, revenue: 0 });
    products[l.name].units += l.qty; products[l.name].revenue += l.qty * l.unitPaise;
  }
  const states = {};
  for (const o of paid) {
    const k = (o.state || 'Unknown').trim();
    (states[k] ||= { state: k, orders: 0, revenue: 0 });
    states[k].orders++; states[k].revenue += o.total_paise;
  }
  const customers = {};
  for (const o of paid) customers[o.phone] = (customers[o.phone] || 0) + 1;
  const repeat = Object.values(customers).filter((n) => n > 1).length;

  // all-time work queue (not limited to date range)
  const q = async (sql) => (await env.DB.prepare(sql).first()).n;
  const queue = {
    toOrder: await q("SELECT COUNT(*) n FROM orders WHERE status='paid' AND fulfilment_status='new'"),
    toShip: await q("SELECT COUNT(*) n FROM orders WHERE status='paid' AND fulfilment_status='ordered'"),
    inTransit: await q("SELECT COUNT(*) n FROM orders WHERE status='paid' AND fulfilment_status='shipped'"),
    stuck: await q("SELECT COUNT(*) n FROM orders WHERE status='paid' AND fulfilment_status='shipped' AND shipped_at < datetime('now','-10 days')"),
    messages: await q("SELECT COUNT(*) n FROM messages WHERE status='new'"),
    late: await q("SELECT COUNT(*) n FROM orders WHERE status='paid' AND fulfilment_status IN ('new','ordered') AND paid_at < datetime('now','-2 days')"),
  };
  const funnel = {};
  for (const o of paid) funnel[o.fulfilment_status] = (funnel[o.fulfilment_status] || 0) + 1;

  // average days from payment to delivery
  const dl = paid.filter((o) => o.delivered_at);
  const avgDeliveryDays = dl.length
    ? Math.round(sum(dl, (o) => (new Date(o.delivered_at.replace(' ', 'T') + 'Z') - new Date(o.paid_at.replace(' ', 'T') + 'Z')) / 86400000) / dl.length * 10) / 10
    : null;

  return json({
    days, orders: paid.length, gross, refunds, net, fees, abandoned,
    aov: paid.length ? Math.round(gross / paid.length) : 0,
    cogs, profit, costedOrders: costed.length, repeatCustomers: repeat, uniqueCustomers: Object.keys(customers).length,
    avgDeliveryDays, queue, funnel, daily,
    topProducts: Object.values(products).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    topStates: Object.values(states).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  });
}
