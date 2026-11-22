import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const U = createRequire(import.meta.url)('../../public/admin/agent-util.js');

test('schedule label reads naturally', () => {
  assert.equal(U.scheduleLabel({ slots: [7, 17] }), 'Twice a day · 7 AM, 5 PM');
  assert.equal(U.scheduleLabel({ slots: [9] }), 'Daily · 9 AM');
  assert.equal(U.scheduleLabel({ slots: [13, 20] }), 'Twice a day · 1 PM, 8 PM');
  assert.equal(U.scheduleLabel({ everyMin: 15 }), 'Every 15 min');
  assert.equal(U.scheduleLabel({ everyMin: 360 }), 'Every 6 hours');
  assert.equal(U.scheduleLabel({ everyMin: 1440 }), 'Once a day');
  assert.equal(U.scheduleLabel({ everyMin: 0, locked: true }), 'Not active');
  assert.equal(U.scheduleLabel({ everyMin: 1440, hourIst: 8 }), 'Daily · 8 AM');
});
test('every skill belongs to exactly one team group', () => {
  const ids = ['market_watch', 'social_listening', 'insights', 'keyword_research', 'topic_planner', 'content_writer', 'product_copy', 'social_fill', 'social_research', 'social_writer', 'social_visual', 'content_review', 'social_manager', 'cj_orders', 'order_watch', 'seo_health', 'daily_report', 'ads'];
  for (const id of ids) assert.ok(U.GROUPS.filter((g) => g.ids.includes(id)).length === 1, id);
  assert.deepEqual(U.GROUPS.map((g) => g.key), ['research', 'create', 'publish', 'store']);
});
test('"needs you" hides duplicates and problems that a later successful run already fixed', () => {
  const now = Date.parse('2026-11-23T02:00:00Z');
  const log = [
    { id: 9, skill: 'content_writer', level: 'action', title: 'Drafted: X', at: '2026-11-23 01:27:00' },
    { id: 8, skill: 'content_writer', level: 'alert', title: 'Blog writer failed', at: '2026-11-23 01:22:00' },
    { id: 7, skill: 'seo_health', level: 'warn', title: 'IndexNow failed', at: '2026-11-23 01:19:00' },
    { id: 6, skill: 'seo_health', level: 'warn', title: 'IndexNow failed', at: '2026-11-22 12:20:00' },
    { id: 5, skill: 'insights', level: 'warn', title: 'Insights: 3 to connect', at: '2026-11-23 01:19:00' },
    { id: 1, skill: 'old', level: 'alert', title: 'Ancient', at: '2026-11-10 01:19:00' },
  ];
  const n = U.needsYou(log, now);
  assert.deepEqual(n.map((x) => x.title), ['IndexNow failed', 'Insights: 3 to connect']);
  assert.equal(n[0].count, 2);
});
test('time is shown in India time', () => {
  assert.match(U.fmtIst('2026-11-23 01:27:00'), /23 Nov.*0?6:57/);
});
test('first sentence helper keeps one-liners short', () => {
  assert.equal(U.firstSentence('Does a thing. Then another thing.'), 'Does a thing.');
  assert.ok(U.firstSentence('x'.repeat(300)).length <= 160);
});
