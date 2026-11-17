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
