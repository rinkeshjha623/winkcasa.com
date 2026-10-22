import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';
import { ensureSeeded, parseProduct } from '../../../src/store.js';

const s = (v, n) => String(v ?? '').trim().slice(0, n);
const int = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : NaN; };
const okImg = (u) => /^(https:\/\/|\/img\/)/.test(u) && u.length <= 600;

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  await ensureSeeded(env);
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY sort, id').all();
  return json(results.map(parseProduct));
}

// POST: create (no id) or update (id). Body fields: name, category, price, mrp, description, tag,
// images[], stock (null = unlimited), active, sort, supplier, cost
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const name = s(b.name, 100), price = int(b.price);
  if (name.length < 2) return json({ error: 'Enter a product name.' }, 400);
  if (!(price >= 1 && price <= 1000000)) return json({ error: 'Enter a price in whole rupees.' }, 400);
  const mrp = b.mrp === '' || b.mrp == null ? null : int(b.mrp);
  if (mrp !== null && !(mrp >= 1)) return json({ error: 'MRP must be a number.' }, 400);
  const stock = b.stock === '' || b.stock == null ? null : int(b.stock);
  if (stock !== null && !(stock >= 0)) return json({ error: 'Stock must be 0 or more, or blank for unlimited.' }, 400);
  const images = (Array.isArray(b.images) ? b.images : []).map((u) => s(u, 600)).filter(okImg).slice(0, 6);
  const cost = Math.max(0, int(b.cost) || 0);
  const vals = [name, s(b.category, 40) || 'General', price, mrp, s(b.description, 200), s(b.tag, 20) || null,
    JSON.stringify(images), stock, b.active === false || b.active === 0 ? 0 : 1, Math.max(0, int(b.sort) || 0), s(b.supplier, 80) || null, cost];

  if (b.id) {
    const r = await env.DB.prepare(`UPDATE products SET name=?,category=?,price=?,mrp=?,description=?,tag=?,images_json=?,stock=?,active=?,sort=?,supplier=?,cost=?,updated_at=datetime('now') WHERE id=?`)
      .bind(...vals, Number(b.id)).run();
    if (!r.meta.changes) return json({ error: 'Product not found.' }, 404);
    return json({ ok: true, id: Number(b.id) });
  }
  await ensureSeeded(env);
  const max = (await env.DB.prepare('SELECT COALESCE(MAX(sort),0) m FROM products').first()).m;
  vals[9] = vals[9] || max + 1;
  const r = await env.DB.prepare(`INSERT INTO products (name,category,price,mrp,description,tag,images_json,stock,active,sort,supplier,cost) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(...vals).run();
  return json({ ok: true, id: r.meta.last_row_id });
}

export async function onRequestDelete({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return json({ error: 'Missing id.' }, 400);
  await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
  return json({ ok: true });
}
