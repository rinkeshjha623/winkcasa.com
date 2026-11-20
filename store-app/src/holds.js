// Stock held by checkouts that were started in the last 30 minutes and not paid yet, so the last items are not sold twice.
export async function heldQty(env, minutes = 30) {
  const { results } = await env.DB.prepare(`SELECT items_json FROM orders WHERE status='created' AND created_at > datetime('now', ?)`).bind(`-${minutes} minutes`).all();
  const held = {};
  for (const r of results) { let items = []; try { items = JSON.parse(r.items_json); } catch { continue; } for (const i of items) held[i.id] = (held[i.id] || 0) + (Number(i.qty) || 1); }
  return held;
}
