import test from 'node:test';
import assert from 'node:assert/strict';
import { homePageLd, productLd } from '../../src/seo.js';
import { DEFAULTS } from '../../src/store.js';

const prod = { id: 4, name: 'Rose Face Mist', price: 399, url: '/p/4-rose-face-mist', image: '/i.jpg', images: ['/i.jpg'], description: 'A light hydrating mist.', stock: null, category: 'Skincare' };
const policyOk = (o) => {
  const r = o.hasMerchantReturnPolicy;
  assert.ok(r, 'hasMerchantReturnPolicy'); assert.ok(r.returnMethod, 'returnMethod'); assert.ok(r.returnFees, 'returnFees');
  assert.ok(o.shippingDetails, 'shippingDetails'); assert.ok(o.validFrom, 'validFrom');
};

test('home page product list: every item has description, shipping and return policy (Google Merchant listings)', () => {
  const ld = homePageLd(DEFAULTS, [prod]);
  const item = ld.mainEntity.itemListElement[0].item;
  assert.ok(item.description && item.description.length > 5, 'description');
  policyOk(item.offers);
});
test('product page offer carries returnMethod, returnFees and validFrom', () => {
  policyOk(productLd(prod, DEFAULTS).offers);
});
test('home list uses the short description field the store actually provides (dim)', () => {
  const { description, ...noDesc } = prod; // what publicProduct() returns: description lives in "dim"
  const item = homePageLd(DEFAULTS, [{ ...noDesc, dim: 'Hydrating rose mist, 100 ml.' }]).mainEntity.itemListElement[0].item;
  assert.equal(item.description, 'Hydrating rose mist, 100 ml.');
});
test('every offer states priceValidUntil (home list and product page)', () => {
  const item = homePageLd(DEFAULTS, [prod]).mainEntity.itemListElement[0].item;
  assert.match(item.offers.priceValidUntil, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(productLd(prod, DEFAULTS).offers.priceValidUntil, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(new Date(item.offers.priceValidUntil) > new Date(), 'must be in the future');
});
test('product data has NO rating when there are no real reviews', () => {
  assert.equal(productLd(prod, DEFAULTS).aggregateRating, undefined);
  assert.equal(productLd(prod, DEFAULTS, { n: 0, avg: null, list: [] }).aggregateRating, undefined);
});
test('product data carries the real rating and reviews once they exist', () => {
  const ld = productLd(prod, DEFAULTS, { n: 2, avg: 4.5, list: [{ name: 'Asha', rating: 5, text: 'Lovely', created_at: '2026-11-10 10:00:00' }, { name: 'Meera', rating: 4, text: '', created_at: '2026-11-11 10:00:00' }] });
  assert.deepEqual([ld.aggregateRating.ratingValue, ld.aggregateRating.reviewCount, ld.aggregateRating.bestRating], ['4.5', '2', '5']);
  assert.equal(ld.review.length, 2);
  assert.equal(ld.review[0].author.name, 'Asha'); assert.equal(ld.review[0].reviewRating.ratingValue, '5');
});
