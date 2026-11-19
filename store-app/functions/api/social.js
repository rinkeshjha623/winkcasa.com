import { ensureReviews, summarize, badgeFor, soldCounts } from '../../src/reviews.js';
import { activeProducts } from '../../src/store.js';

// GET -> { p: { [productId]: { r: rating, n: reviewCount, b: badgeText } } } built only from real approved reviews and real paid orders.
export async function onRequestGet({ env }) {
  await ensureReviews(env);
  const [rv, ord, prods] = await Promise.all([
    env.DB.prepare("SELECT product_id, rating FROM reviews WHERE status='approved'").all(),
    env.DB.prepare("SELECT status, paid_at, items_json FROM orders WHERE status='paid' AND paid_at > datetime('now','-30 days') LIMIT 5000").all(),
    activeProducts(env),
  ]);
  const by = {}; for (const r of rv.results) (by[r.product_id] ||= []).push(r);
  const sold = soldCounts(ord.results);
  const p = {};
  for (const pr of prods) {
    const s = summarize(by[pr.id] || []);
    const b = badgeFor({ sold: sold[pr.id] || 0, stock: pr.stock === undefined ? null : pr.stock });
    if (s.n || b) p[pr.id] = { ...(s.n ? { r: s.avg, n: s.n } : {}), ...(b ? { b } : {}) };
  }
  return new Response(JSON.stringify({ p }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=120' } });
}
