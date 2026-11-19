import test from 'node:test';
import assert from 'node:assert/strict';
import { starsHtml, reviewsSectionHtml } from '../../src/reviews-ui.js';

test('starsHtml: width follows the real average and is accessible', () => {
  const h = starsHtml(4.5);
  assert.match(h, /width:90%/); assert.match(h, /aria-label="Rated 4.5 out of 5"/);
  assert.match(starsHtml(5), /width:100%/);
});
test('section with no reviews invites a first review and shows no rating', () => {
  const h = reviewsSectionHtml({ n: 0, avg: null, list: [] });
  assert.match(h, /No reviews yet/); assert.doesNotMatch(h, /out of 5/);
});
test('reviews are escaped, verified buyers are labelled, manual ones are not called verified, owner reply shown', () => {
  const h = reviewsSectionHtml({ n: 3, avg: 4.3, list: [
    { id: 1, name: '<script>x</script>', rating: 5, text: '<img src=x onerror=1>', verified: 1, source: 'buyer', pinned: 0, reply: 'Thank you!', created_at: '2026-11-10 10:00:00' },
    { id: 2, name: 'Meera', rating: 4, text: 'Nice', verified: 0, source: 'manual', pinned: 0, created_at: '2026-11-11 10:00:00' },
    { id: 3, name: 'Zoya', rating: 4, text: 'Good', verified: 1, source: 'buyer', pinned: 1, created_at: '2026-11-12 10:00:00' }] });
  assert.doesNotMatch(h, /<script>x/); assert.doesNotMatch(h, /<img src=x/);
  assert.match(h, /Verified buyer/); assert.match(h, /Customer message/); assert.match(h, /Thank you!/);
  assert.equal((h.match(/Verified buyer/g) || []).length, 2);
  assert.ok(h.indexOf('Zoya') < h.indexOf('Meera'), 'pinned review comes first');
  assert.match(h, /4\.3/);
});
