import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDB } from '../helpers/d1.mjs';
import * as reviewsApi from '../../functions/api/reviews.js';
import * as socialApi from '../../functions/api/social.js';
import * as adminApi from '../../functions/api/admin/reviews.js';

const env = { DB: makeDB(), ADMIN_TOKEN: 'adm-token' };
const post = (fn, url, body, h = {}) => fn({ env, request: new Request('https://x' + url, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) }) });
const adm = { authorization: 'Bearer adm-token' };
const addOrder = (ref, phone, status, ful, items, paidAt = "datetime('now')") => env.DB.raw.exec(
  `INSERT INTO orders (order_ref,razorpay_order_id,status,subtotal_paise,shipping_paise,total_paise,customer_name,phone,email,address,city,state,pincode,items_json,paid_at,fulfilment_status)
   VALUES ('${ref}','rz_${ref}','${status}',1,0,1,'Asha Rao','${phone}','a@x.com','addr','Delhi','Delhi','110001','${JSON.stringify(items)}',${paidAt},'${ful}')`);

addOrder('WC-DELIVER', '9810000001', 'paid', 'delivered', [{ id: 4, qty: 1 }]);
addOrder('WC-SHIPPED', '9810000002', 'paid', 'shipped', [{ id: 4, qty: 1 }]);
const good = { ref: 'WC-DELIVER', phone: '98100 00001', product_id: 4, rating: 5, text: 'Beautiful and light.', name: 'Asha' };

test('buyer cannot review before delivery, with wrong phone, or for an item not in the order', async () => {
  assert.equal((await post(reviewsApi.onRequestPost, '/api/reviews', { ...good, ref: 'WC-SHIPPED', phone: '9810000002' })).status, 403);
  assert.equal((await post(reviewsApi.onRequestPost, '/api/reviews', { ...good, phone: '9999999999' })).status, 404);
  assert.equal((await post(reviewsApi.onRequestPost, '/api/reviews', { ...good, product_id: 99 })).status, 403);
  assert.equal((await post(reviewsApi.onRequestPost, '/api/reviews', { ...good, rating: 9 })).status, 400);
});
test('verified buyer review is saved once per order and item', async () => {
  const r = await post(reviewsApi.onRequestPost, '/api/reviews', good);
  assert.equal(r.status, 200);
  assert.equal((await post(reviewsApi.onRequestPost, '/api/reviews', good)).status, 409);
  const row = env.DB.raw.prepare('SELECT * FROM reviews WHERE product_id=4').get();
  assert.equal(row.verified, 1); assert.equal(row.source, 'buyer'); assert.equal(row.rating, 5);
});
test('/api/social: rating comes only from real approved reviews; products without reviews get none', async () => {
  const j = await (await socialApi.onRequestGet({ env, request: new Request('https://x/api/social') })).json();
  assert.deepEqual([j.p[4].r, j.p[4].n], [5, 1]);
  assert.equal(j.p[7]?.r, undefined);
});
test('/api/social: sold badge counts real paid orders (3+ needed) and never invents numbers', async () => {
  for (let i = 0; i < 3; i++) addOrder('WC-S' + i, '98100001' + i + '0', 'paid', 'new', [{ id: 7, qty: 1 }]);
  const j = await (await socialApi.onRequestGet({ env, request: new Request('https://x/api/social') })).json();
  assert.match(j.p[7].b, /3 bought this in the last 30 days/);
  assert.ok(!j.p[4]?.b || !/bought/.test(j.p[4].b)); // only 1 sold -> no badge
});
test('hidden reviews do not count', async () => {
  const id = env.DB.raw.prepare('SELECT id FROM reviews').get().id;
  assert.equal((await post(adminApi.onRequestPost, '/api/admin/reviews', { action: 'hide', id }, adm)).status, 200);
  const j = await (await socialApi.onRequestGet({ env, request: new Request('https://x/api/social') })).json();
  assert.equal(j.p[4]?.r, undefined);
  await post(adminApi.onRequestPost, '/api/admin/reviews', { action: 'show', id }, adm);
});
test('admin endpoints reject requests without the admin token', async () => {
  assert.equal((await post(adminApi.onRequestPost, '/api/admin/reviews', { action: 'hide', id: 1 })).status, 401);
  assert.equal((await adminApi.onRequestGet({ env, request: new Request('https://x/api/admin/reviews') })).status, 401);
});
test('admin can add a customer review from a message, but must say where it came from and it is not marked verified', async () => {
  const bad = await post(adminApi.onRequestPost, '/api/admin/reviews', { action: 'add', product_id: 4, name: 'Meera', rating: 5, text: 'Love it' }, adm);
  assert.equal(bad.status, 400); // source note required
  const ok = await post(adminApi.onRequestPost, '/api/admin/reviews', { action: 'add', product_id: 4, name: 'Meera', rating: 4, text: 'Love it', source_note: 'WhatsApp 18 Nov, screenshot saved' }, adm);
  assert.equal(ok.status, 200);
  const row = env.DB.raw.prepare("SELECT * FROM reviews WHERE source='manual'").get();
  assert.equal(row.verified, 0); assert.equal(row.rating, 4);
  const j = await (await socialApi.onRequestGet({ env, request: new Request('https://x/api/social') })).json();
  assert.deepEqual([j.p[4].r, j.p[4].n], [4.5, 2]); // 5 and 4 -> 4.5 (real average of what is stored)
});
test('admin cannot set a rating or count directly', async () => {
  const r = await post(adminApi.onRequestPost, '/api/admin/reviews', { action: 'set_rating', product_id: 4, rating: 4.9, count: 500 }, adm);
  assert.equal(r.status, 400);
});
