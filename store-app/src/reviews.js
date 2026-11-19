// Customer reviews and honest demand signals. Every number shown to shoppers is counted from real reviews and real orders.
export const REVIEWS_SQL = `CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, order_ref TEXT, name TEXT NOT NULL, rating INTEGER NOT NULL, text TEXT, verified INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'buyer', source_note TEXT, status TEXT NOT NULL DEFAULT 'approved', pinned INTEGER NOT NULL DEFAULT 0, reply TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`;
export const REVIEWS_INDEX_SQL = 'CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, status)';
export async function ensureReviews(env) {
  await env.DB.prepare(REVIEWS_SQL).run();
  await env.DB.prepare(REVIEWS_INDEX_SQL).run();
}

export function summarize(rows) {
  const n = rows.length;
  if (!n) return { n: 0, avg: null };
  return { n, avg: Math.round((rows.reduce((s, r) => s + Number(r.rating), 0) / n) * 10) / 10 };
}

// One short line shown on a product card. Only true facts: orders in the last 30 days, and stock actually left.
export function badgeFor({ sold = 0, stock = null }) {
  const parts = [];
  if (sold >= 3) parts.push(`${sold} bought this in the last 30 days`);
  if (stock !== null && stock > 0 && stock <= 5) parts.push(`Only ${stock} left`);
  return parts.join(' · ');
}

export function cleanReview(b) {
  const rating = Number(b && b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Choose a rating from 1 to 5 stars.' };
  return {
    rating,
    text: String((b && b.text) || '').trim().slice(0, 1000),
    name: String((b && b.name) || '').trim().slice(0, 40) || 'WinkCasa customer',
  };
}

// A buyer may review a product only after that order was paid and delivered, and only for items in that order.
export function canReview(order, productId) {
  if (!order || order.status !== 'paid') return { error: 'This order has not been paid.' };
  if (order.fulfilment_status !== 'delivered') return { error: 'You can review once your order is delivered.' };
  let items = []; try { items = JSON.parse(order.items_json); } catch { return { error: 'This order could not be read.' }; }
  if (!Array.isArray(items) || !items.some((i) => Number(i.id) === Number(productId))) return { error: 'That item is not in this order.' };
  return { ok: true };
}

export function soldCounts(orders, now = new Date(), days = 30) {
  const since = now.getTime() - days * 86400000, out = {};
  for (const o of orders) {
    if (o.status !== 'paid' || !o.paid_at) continue;
    if (new Date(String(o.paid_at).replace(' ', 'T') + 'Z').getTime() < since) continue;
    let items = []; try { items = JSON.parse(o.items_json); } catch { continue; }
    for (const i of items) out[i.id] = (out[i.id] || 0) + (Number(i.qty) || 1);
  }
  return out;
}
