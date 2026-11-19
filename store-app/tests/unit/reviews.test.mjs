import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, badgeFor, cleanReview, canReview, soldCounts } from '../../src/reviews.js';

test('summarize: average to 1 decimal and a true count; nothing shown when there are no reviews', () => {
  assert.deepEqual(summarize([]), { n: 0, avg: null });
  assert.deepEqual(summarize([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), { n: 3, avg: 4.3 });
  assert.deepEqual(summarize([{ rating: 5 }]), { n: 1, avg: 5 });
});
test('badgeFor: only real demand signals', () => {
  assert.equal(badgeFor({ sold: 0, stock: null }), '');
  assert.equal(badgeFor({ sold: 2, stock: null }), '');
  assert.equal(badgeFor({ sold: 7, stock: null }), '7 bought this in the last 30 days');
  assert.equal(badgeFor({ sold: 0, stock: 3 }), 'Only 3 left');
  assert.equal(badgeFor({ sold: 7, stock: 3 }), '7 bought this in the last 30 days · Only 3 left');
  assert.equal(badgeFor({ sold: 0, stock: 0 }), '');
  assert.equal(badgeFor({ sold: 0, stock: 40 }), '');
});
test('cleanReview: rating 1-5 whole number, text trimmed and capped, name defaulted', () => {
  assert.ok(cleanReview({ rating: 0 }).error);
  assert.ok(cleanReview({ rating: 6 }).error);
  assert.ok(cleanReview({ rating: 4.5 }).error);
  assert.ok(cleanReview({ rating: 'x' }).error);
  const r = cleanReview({ rating: '5', text: '  Lovely!  ', name: '' });
  assert.deepEqual([r.rating, r.text, r.name], [5, 'Lovely!', 'WinkCasa customer']);
  assert.equal(cleanReview({ rating: 5, text: 'a'.repeat(5000) }).text.length, 1000);
  assert.equal(cleanReview({ rating: 5, text: '<b>hi</b>' }).text, '<b>hi</b>'); // stored raw, always escaped on output
});
test('canReview: only paid AND delivered orders that contain the product', () => {
  const o = { status: 'paid', fulfilment_status: 'delivered', items_json: JSON.stringify([{ id: 4, qty: 1 }]) };
  assert.equal(canReview(o, 4).ok, true);
  assert.ok(canReview({ ...o, fulfilment_status: 'shipped' }, 4).error);
  assert.ok(canReview({ ...o, status: 'created' }, 4).error);
  assert.ok(canReview(o, 99).error);
  assert.ok(canReview({ ...o, items_json: 'not json' }, 4).error);
});
test('soldCounts: sums paid orders from the last 30 days only', () => {
  const now = new Date('2026-11-19T00:00:00Z');
  const rows = [
    { status: 'paid', paid_at: '2026-11-10 10:00:00', items_json: JSON.stringify([{ id: 1, qty: 2 }, { id: 2, qty: 1 }]) },
    { status: 'paid', paid_at: '2026-11-18 10:00:00', items_json: JSON.stringify([{ id: 1, qty: 1 }]) },
    { status: 'paid', paid_at: '2026-09-01 10:00:00', items_json: JSON.stringify([{ id: 1, qty: 9 }]) },
    { status: 'created', paid_at: null, items_json: JSON.stringify([{ id: 1, qty: 9 }]) },
  ];
  assert.deepEqual(soldCounts(rows, now), { 1: 3, 2: 1 });
});
