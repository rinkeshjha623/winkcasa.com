import { json } from '../../src/lib.js';
import { hashPassword, checkPassword, startSession, endSession, clearCookies, getCustomer, jsonCookies } from '../../src/auth.js';
import { activeProducts, productPath } from '../../src/store.js';

const t = (v, n) => String(v ?? '').trim().slice(0, n);
const okEmail = (e) => /^\S+@\S+\.\S+$/.test(e);
const badPw = (p) => (typeof p !== 'string' || p.length < 8 ? 'Use a password of at least 8 characters.' : p.length > 100 ? 'That password is too long.' : '');
const nowS = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function cleanAddr(a) {
  const o = { label: t(a?.label, 30), name: t(a?.name, 80), phone: t(a?.phone, 15).replace(/[\s-]/g, ''), address: t(a?.address, 300), city: t(a?.city, 60), state: t(a?.state, 60), pincode: t(a?.pincode, 6) };
  if (o.name.length < 2) return { error: 'Enter the full name for this address.' };
  if (!/^(\+91)?[6-9]\d{9}$/.test(o.phone)) return { error: 'Enter a valid 10-digit mobile number.' };
  if (o.address.length < 8) return { error: 'Enter the full address.' };
  if (!o.city || !o.state) return { error: 'Enter city and state.' };
  if (!/^[1-9]\d{5}$/.test(o.pincode)) return { error: 'Enter a valid 6-digit pincode.' };
  return { value: o };
}

async function overview(env, me) {
  const [ords, addrs, wish, rows] = await Promise.all([
    env.DB.prepare(`SELECT order_ref, status, fulfilment_status, total_paise, items_json, created_at, delivery_min_at, delivery_max_at, tracking_number, courier
      FROM orders WHERE customer_id=? AND status!='created' ORDER BY id DESC LIMIT 50`).bind(me.id).all(),
    env.DB.prepare('SELECT * FROM addresses WHERE customer_id=? ORDER BY is_default DESC, id DESC').bind(me.id).all(),
    env.DB.prepare('SELECT product_id FROM wishlist WHERE customer_id=? ORDER BY created_at DESC').bind(me.id).all(),
    activeProducts(env),
  ]);
  const byId = new Map(rows.map((p) => [p.id, p]));
  return {
    customer: me,
    orders: ords.results.map((o) => { let items = []; try { items = JSON.parse(o.items_json); } catch {}
      return { ref: o.order_ref, paid: o.status === 'paid', status: o.fulfilment_status, total: o.total_paise, placedAt: o.created_at, deliveryMinAt: o.delivery_min_at, deliveryMaxAt: o.delivery_max_at, tracking: o.tracking_number, courier: o.courier, items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty })) }; }),
    addresses: addrs.results,
    wishlist: wish.results.map((w) => byId.get(w.product_id)).filter(Boolean).map((p) => ({ id: p.id, name: p.name, price: p.price, image: (p.images || [])[0] || '', url: productPath(p) })),
    wishIds: wish.results.map((w) => w.product_id),
  };
}

export async function onRequestGet({ request, env }) {
  const me = await getCustomer(request, env);
  if (!me) return json({ customer: null, wishIds: [] });
  return json(await overview(env, me));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Accounts are not available right now.' }, 503);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'Invalid request.' }, 400);
  let b; try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const act = b.action;

  if (act === 'signup') {
    const name = t(b.name, 80), email = t(b.email, 120).toLowerCase(), phone = t(b.phone, 15).replace(/[\s-]/g, '');
    if (name.length < 2) return json({ error: 'Enter your name.' }, 400);
    if (!okEmail(email)) return json({ error: 'Enter a valid email address.' }, 400);
    if (phone && !/^(\+91)?[6-9]\d{9}$/.test(phone)) return json({ error: 'Enter a valid 10-digit mobile number, or leave it blank.' }, 400);
    const pe = badPw(b.password); if (pe) return json({ error: pe }, 400);
    if (b.website) return json({ ok: true });
    if (await env.DB.prepare('SELECT id FROM customers WHERE email=?').bind(email).first()) return json({ error: 'An account with this email already exists. Please log in.' }, 409);
    const { hash, salt } = await hashPassword(b.password);
    const r = await env.DB.prepare('INSERT INTO customers (email,name,phone,pass_hash,pass_salt) VALUES (?,?,?,?,?)').bind(email, name, phone || null, hash, salt).run();
    const me = { id: r.meta.last_row_id, email, name, phone: phone || null };
    return jsonCookies(await overview(env, me), 200, await startSession(env, me.id));
  }

  if (act === 'login') {
    const email = t(b.email, 120).toLowerCase();
    const c = await env.DB.prepare('SELECT * FROM customers WHERE email=?').bind(email).first();
    const bad = () => json({ error: 'Email or password is not correct.' }, 401);
    if (!c) { await hashPassword(String(b.password || '')); return bad(); }
    if (c.locked_until && c.locked_until > nowS()) return json({ error: 'Too many attempts. Please try again in 15 minutes.' }, 429);
    if (!(await checkPassword(String(b.password || ''), c.pass_hash, c.pass_salt))) {
      const f = c.fails + 1;
      await env.DB.prepare('UPDATE customers SET fails=?, locked_until=? WHERE id=?').bind(f >= 5 ? 0 : f, f >= 5 ? new Date(Date.now() + 900000).toISOString().slice(0, 19).replace('T', ' ') : null, c.id).run();
      return bad();
    }
    await env.DB.prepare('UPDATE customers SET fails=0, locked_until=NULL WHERE id=?').bind(c.id).run();
    const me = { id: c.id, email: c.email, name: c.name, phone: c.phone };
    return jsonCookies(await overview(env, me), 200, await startSession(env, me.id));
  }

  if (act === 'logout') { await endSession(request, env); return jsonCookies({ ok: true }, 200, clearCookies()); }

  const me = await getCustomer(request, env);
  if (!me) return json({ error: 'Please log in.' }, 401);

  if (act === 'profile') {
    const name = t(b.name, 80), phone = t(b.phone, 15).replace(/[\s-]/g, '');
    if (name.length < 2) return json({ error: 'Enter your name.' }, 400);
    if (phone && !/^(\+91)?[6-9]\d{9}$/.test(phone)) return json({ error: 'Enter a valid 10-digit mobile number, or leave it blank.' }, 400);
    await env.DB.prepare('UPDATE customers SET name=?, phone=? WHERE id=?').bind(name, phone || null, me.id).run();
    return json(await overview(env, { ...me, name, phone: phone || null }));
  }
  if (act === 'password') {
    const c = await env.DB.prepare('SELECT pass_hash, pass_salt FROM customers WHERE id=?').bind(me.id).first();
    if (!(await checkPassword(String(b.current || ''), c.pass_hash, c.pass_salt))) return json({ error: 'Your current password is not correct.' }, 400);
    const pe = badPw(b.password); if (pe) return json({ error: pe }, 400);
    const { hash, salt } = await hashPassword(b.password);
    await env.DB.prepare('UPDATE customers SET pass_hash=?, pass_salt=? WHERE id=?').bind(hash, salt, me.id).run();
    await env.DB.prepare('DELETE FROM sessions WHERE customer_id=?').bind(me.id).run();
    return jsonCookies({ ok: true, reloginNeeded: true }, 200, clearCookies());
  }
  if (act === 'address_save') {
    const a = cleanAddr(b.address); if (a.error) return json({ error: a.error }, 400);
    const n = (await env.DB.prepare('SELECT COUNT(*) n FROM addresses WHERE customer_id=?').bind(me.id).first()).n;
    const id = Number(b.address?.id) || 0;
    if (id) await env.DB.prepare('UPDATE addresses SET label=?,name=?,phone=?,address=?,city=?,state=?,pincode=? WHERE id=? AND customer_id=?')
      .bind(a.value.label, a.value.name, a.value.phone, a.value.address, a.value.city, a.value.state, a.value.pincode, id, me.id).run();
    else { if (n >= 10) return json({ error: 'You can save up to 10 addresses.' }, 400);
      await env.DB.prepare('INSERT INTO addresses (customer_id,label,name,phone,address,city,state,pincode,is_default) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(me.id, a.value.label, a.value.name, a.value.phone, a.value.address, a.value.city, a.value.state, a.value.pincode, n === 0 ? 1 : 0).run(); }
    return json(await overview(env, me));
  }
  if (act === 'address_default') {
    await env.DB.prepare('UPDATE addresses SET is_default = CASE WHEN id=? THEN 1 ELSE 0 END WHERE customer_id=?').bind(Number(b.id), me.id).run();
    return json(await overview(env, me));
  }
  if (act === 'address_delete') {
    await env.DB.prepare('DELETE FROM addresses WHERE id=? AND customer_id=?').bind(Number(b.id), me.id).run();
    return json(await overview(env, me));
  }
  if (act === 'wish') {
    const pid = Number(b.id); if (!Number.isInteger(pid)) return json({ error: 'Invalid product.' }, 400);
    const has = await env.DB.prepare('SELECT 1 x FROM wishlist WHERE customer_id=? AND product_id=?').bind(me.id, pid).first();
    if (has) await env.DB.prepare('DELETE FROM wishlist WHERE customer_id=? AND product_id=?').bind(me.id, pid).run();
    else await env.DB.prepare('INSERT OR IGNORE INTO wishlist (customer_id,product_id) VALUES (?,?)').bind(me.id, pid).run();
    return json(await overview(env, me));
  }
  if (act === 'delete_account') {
    const c = await env.DB.prepare('SELECT pass_hash, pass_salt FROM customers WHERE id=?').bind(me.id).first();
    if (!(await checkPassword(String(b.password || ''), c.pass_hash, c.pass_salt))) return json({ error: 'Password is not correct.' }, 400);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE customer_id=?').bind(me.id), env.DB.prepare('DELETE FROM addresses WHERE customer_id=?').bind(me.id),
      env.DB.prepare('DELETE FROM wishlist WHERE customer_id=?').bind(me.id), env.DB.prepare('UPDATE orders SET customer_id=NULL WHERE customer_id=?').bind(me.id),
      env.DB.prepare('DELETE FROM customers WHERE id=?').bind(me.id)]);
    return jsonCookies({ ok: true }, 200, clearCookies());
  }
  return json({ error: 'Unknown action.' }, 400);
}
