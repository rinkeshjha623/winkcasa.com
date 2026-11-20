import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { makeDB } from '../helpers/d1.mjs';
import { normEmail, rateLimit, cronGuard } from '../../src/guard.js';
import * as checkout from '../../functions/api/checkout.js';
import * as verify from '../../functions/api/verify.js';
import * as coupon from '../../functions/api/coupon.js';
import * as track from '../../functions/api/track.js';
import * as contact from '../../functions/api/contact.js';
import * as account from '../../functions/api/account.js';
import * as adminReviews from '../../functions/api/admin/reviews.js';
import { activeProducts } from '../../src/store.js';

// Razorpay is faked: no network, no real orders.
globalThis.fetch = async (u) => (String(u).includes('razorpay.com')
  ? new Response(JSON.stringify({ id: 'order_' + crypto.randomUUID().slice(0, 12) }), { status: 200 }) : new Response('x', { status: 500 }));

const env = { DB: makeDB(), RAZORPAY_KEY_ID: 'k', RAZORPAY_KEY_SECRET: 'secret', ADMIN_TOKEN: 'adm-token' };
const req = (url, body, ip = '1.1.1.1', h = {}) => new Request('https://x' + url, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...h }, body: body ? JSON.stringify(body) : undefined });
const P = await activeProducts(env);
const [pA, pB, pC] = [P[0].id, P[1].id, P[2].id];
let n = 0;
const cust = (email) => ({ name: 'Test Buyer', phone: '98' + String(10000000 + ++n), email: email || `b${n}@ex.com`, address: '12 Test Street Delhi', city: 'Delhi', state: 'Delhi', pincode: '110091' });
const buy = (id, qty = 1, extra = {}, ip) => checkout.onRequestPost({ env, request: req('/api/checkout', { items: [{ id, qty }], customer: cust(extra.email), mode: 'online', ...extra }, ip || '9.9.' + n + '.1') });
const hmac = (k, m) => crypto.createHmac('sha256', k).update(m).digest('hex');
const pay = async (order) => verify.onRequestPost({ env, request: req('/api/verify', { razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: 'pay_' + order.orderRef, razorpay_signature: hmac('secret', order.razorpayOrderId + '|pay_' + order.orderRef) }) });

test('normEmail ignores case, +tags and gmail dots so one person cannot look like many', () => {
  assert.equal(normEmail('Jo.Hn+deal@Gmail.com'), 'john@gmail.com');
  assert.equal(normEmail('a.b@company.in'), 'a.b@company.in');
  assert.equal(normEmail('x+1@company.in'), 'x@company.in');
});

test('rateLimit blocks after the limit and is per bucket and per IP', async () => {
  const r = () => rateLimit(env, req('/x', null, '5.5.5.5'), 'unit', 2, 60);
  assert.equal(await r(), null); assert.equal(await r(), null);
  const blocked = await r(); assert.equal(blocked.status, 429);
  assert.equal(await rateLimit(env, req('/x', null, '6.6.6.6'), 'unit', 2, 60), null);
  assert.equal(await rateLimit(env, req('/x', null, '5.5.5.5'), 'other', 2, 60), null);
});

test('stock is held for open checkouts, so the last items cannot be sold twice', async () => {
  env.DB.raw.exec(`UPDATE products SET stock=2 WHERE id=${pA}`);
  assert.equal((await buy(pA)).status, 200); assert.equal((await buy(pA)).status, 200);
  const third = await buy(pA); assert.equal(third.status, 409);
});

test('if two orders still get paid for the last item, stock never goes negative and the order is flagged', async () => {
  env.DB.raw.exec(`UPDATE products SET stock=1 WHERE id=${pB}`);
  const a = await (await buy(pB)).json();
  env.DB.raw.exec(`UPDATE orders SET created_at=datetime('now','-2 hours') WHERE order_ref='${a.orderRef}'`);
  const b = await (await buy(pB)).json(); // the hold on a has expired, so b is allowed
  await pay(a); await pay(b);
  assert.equal(env.DB.raw.prepare(`SELECT stock FROM products WHERE id=${pB}`).get().stock, 0);
  const ev = env.DB.raw.prepare("SELECT COUNT(*) n FROM order_events WHERE text LIKE 'OVERSOLD%'").get().n;
  assert.equal(ev, 1);
});

test('a coupon with a usage limit cannot be over-claimed by simultaneous checkouts', async () => {
  env.DB.raw.exec(`UPDATE products SET stock=NULL WHERE id=${pC}`);
  env.DB.raw.exec(`INSERT INTO coupons (code,type,value,min_order,usage_limit,once_per_customer,active) VALUES ('LIMIT2','percent',10,0,2,0,1)`);
  const res = await Promise.all(Array.from({ length: 8 }, (_, i) => buy(pC, 1, { coupon: 'LIMIT2' }, '8.8.8.' + i)));
  const ok = res.filter((r) => r.status === 200).length;
  assert.ok(ok <= 2, 'accepted ' + ok);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM orders WHERE coupon_code='LIMIT2'").get().n, ok);
});

test('"once per customer" cannot be dodged with email aliases', async () => {
  env.DB.raw.exec(`INSERT INTO coupons (code,type,value,min_order,usage_limit,once_per_customer,active) VALUES ('ONCE','percent',10,0,0,1,1)`);
  assert.equal((await buy(pC, 1, { coupon: 'ONCE', email: 'jo.hn+a@gmail.com' }, '7.7.7.1')).status, 200);
  const again = await buy(pC, 1, { coupon: 'ONCE', email: 'john@gmail.com' }, '7.7.7.2');
  assert.equal(again.status, 400);
});

test('checkout, coupon and track are rate limited per IP', async () => {
  const ip = '4.4.4.4'; let last;
  for (let i = 0; i < 40; i++) last = await coupon.onRequestPost({ env, request: req('/api/coupon', { items: [{ id: pC, qty: 1 }], code: 'X' + i }, ip) });
  assert.equal(last.status, 429);
  for (let i = 0; i < 30; i++) last = await track.onRequestPost({ env, request: req('/api/track', { ref: 'WC-0000000' + i, phone: '9999999999' }, '4.4.4.5') });
  assert.equal(last.status, 429);
  for (let i = 0; i < 20; i++) last = await buy(pC, 1, {}, '4.4.4.6');
  assert.equal(last.status, 429);
});

test('contact messages are limited per IP, not just per email', async () => {
  let last;
  for (let i = 0; i < 10; i++) last = await contact.onRequestPost({ env, request: req('/api/contact', { name: 'Spam ' + i, email: `s${i}@ex.com`, message: 'buy cheap pills now please' }, '3.3.3.3') });
  assert.equal(last.status, 429);
});

test('signups are limited per IP', async () => {
  let last;
  for (let i = 0; i < 12; i++) last = await account.onRequestPost({ env, request: req('/api/account', { action: 'signup', name: 'U' + i, email: `su${i}@ex.com`, password: 'Passw0rd!x' + i }, '2.2.2.2') });
  assert.equal(last.status, 429);
});

test('one attacker cannot lock a customer out: wrong passwords only lock that IP', async () => {
  const ok = await account.onRequestPost({ env, request: req('/api/account', { action: 'signup', name: 'Victim', email: 'victim@ex.com', password: 'Correct-pass1' }, '10.0.0.1') });
  assert.equal(ok.status, 200);
  let last; for (let i = 0; i < 8; i++) last = await account.onRequestPost({ env, request: req('/api/account', { action: 'login', email: 'victim@ex.com', password: 'wrong-pass' + i }, '66.6.6.6') });
  assert.equal(last.status, 429);
  const real = await account.onRequestPost({ env, request: req('/api/account', { action: 'login', email: 'victim@ex.com', password: 'Correct-pass1' }, '10.0.0.1') });
  assert.equal(real.status, 200);
});

test('admin: repeated wrong tokens lock that IP out (even with the right token) but not other IPs', async () => {
  const call = (token, ip) => adminReviews.onRequestGet({ env, request: req('/api/admin/reviews', null, ip, { authorization: 'Bearer ' + token }) });
  for (let i = 0; i < 10; i++) assert.equal((await call('wrong' + i, '1.2.3.4')).status, 401);
  assert.equal((await call('adm-token', '1.2.3.4')).status, 429);
  assert.equal((await call('adm-token', '5.6.7.8')).status, 200);
});

test('payment verification fails closed when the Razorpay secret is missing', async () => {
  const bare = { ...env, RAZORPAY_KEY_SECRET: undefined };
  const sig = hmac('undefined', 'order_x|pay_x'); // what the old code would have accepted
  const r = await verify.onRequestPost({ env: bare, request: req('/api/verify', { razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: sig }) });
  assert.ok(r.status >= 400);
});

test('cron endpoints: secret required once set, and calls are spaced out', async () => {
  const withSecret = { ...env, CRON_SECRET: 'cron-s' };
  assert.equal((await cronGuard(req('/api/agent-cron'), withSecret, 'agent', 300)).status, 401);
  assert.equal(await cronGuard(req('/api/agent-cron', null, '1.1.1.1', { authorization: 'Bearer cron-s' }), withSecret, 'agent', 300), null);
  const again = await cronGuard(req('/api/agent-cron', null, '1.1.1.1', { authorization: 'Bearer cron-s' }), withSecret, 'agent', 300);
  assert.equal(again.status, 200); // skipped politely, nothing runs
  assert.equal((await again.json()).skipped, true);
  assert.equal(await cronGuard(req('/api/social-cron'), env, 'social', 120), null); // no secret configured yet: allowed, but still spaced
  assert.equal((await (await cronGuard(req('/api/social-cron'), env, 'social', 120)).json()).skipped, true);
});
