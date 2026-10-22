import { json } from '../../../src/lib.js';
import { requireAdmin } from '../../../src/admin.js';

const s = (v, n) => String(v ?? '').trim().slice(0, n);
const int = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : NaN; };
const when = (v) => { const t = s(v, 25).replace('T', ' '); return /^\d{4}-\d\d-\d\d \d\d:\d\d/.test(t) ? t.slice(0, 16) + ':00' : null; };

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  const { results } = await env.DB.prepare(`SELECT c.*,
    (SELECT COUNT(*) FROM orders o WHERE o.coupon_code=c.code AND o.status NOT IN ('created','cancelled')) uses,
    (SELECT COALESCE(SUM(o.discount_paise),0) FROM orders o WHERE o.coupon_code=c.code AND o.status NOT IN ('created','cancelled')) saved_paise
    FROM coupons c ORDER BY c.active DESC, c.id DESC`).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env); if (denied) return denied;
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (b.action === 'delete') { await env.DB.prepare('DELETE FROM coupons WHERE id=?').bind(Number(b.id)).run(); return json({ ok: true }); }
  if (b.action === 'toggle') { await env.DB.prepare('UPDATE coupons SET active=? WHERE id=?').bind(b.active ? 1 : 0, Number(b.id)).run(); return json({ ok: true }); }
  const code = s(b.code, 20).toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return json({ error: 'Code must be 3 to 20 letters or numbers.' }, 400);
  const type = ['percent', 'fixed', 'freeship'].includes(b.type) ? b.type : 'percent';
  const value = type === 'freeship' ? 0 : int(b.value);
  if (type === 'percent' && !(value >= 1 && value <= 90)) return json({ error: 'Percentage must be between 1 and 90.' }, 400);
  if (type === 'fixed' && !(value >= 1 && value <= 100000)) return json({ error: 'Enter the rupees off, e.g. 100.' }, 400);
  const min = Math.max(0, int(b.min_order) || 0);
  const maxd = b.max_discount === '' || b.max_discount == null ? null : int(b.max_discount);
  if (maxd !== null && !(maxd >= 1)) return json({ error: 'Maximum discount must be a number.' }, 400);
  const lim = b.usage_limit === '' || b.usage_limit == null ? null : int(b.usage_limit);
  if (lim !== null && !(lim >= 1)) return json({ error: 'Usage limit must be 1 or more, or blank.' }, 400);
  const v = [code, type, value, min, type === 'percent' ? maxd : null, when(b.starts_at), when(b.ends_at), lim, b.once_per_customer ? 1 : 0, b.auto_apply ? 1 : 0, b.active === 0 || b.active === false ? 0 : 1, s(b.note, 200) || null];
  try {
    if (b.id) await env.DB.prepare('UPDATE coupons SET code=?,type=?,value=?,min_order=?,max_discount=?,starts_at=?,ends_at=?,usage_limit=?,once_per_customer=?,auto_apply=?,active=?,note=? WHERE id=?').bind(...v, Number(b.id)).run();
    else await env.DB.prepare('INSERT INTO coupons (code,type,value,min_order,max_discount,starts_at,ends_at,usage_limit,once_per_customer,auto_apply,active,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(...v).run();
  } catch (e) { return json({ error: /UNIQUE/i.test(String(e)) ? 'That code already exists.' : 'Could not save.' }, 400); }
  return json({ ok: true });
}
