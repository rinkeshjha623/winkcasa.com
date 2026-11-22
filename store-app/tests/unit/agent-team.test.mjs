import test from 'node:test';
import assert from 'node:assert/strict';
import { dueBySlots } from '../../src/slots.js';
import { seoCheck } from '../../src/blogqa.js';
import { parseFeed, parsePlannerCsv, pickTopics } from '../../src/intel.js';
import { PLAYBOOK, DEFS } from '../../src/agent-defs.js';

const IST = 330 * 60000;
const at = (h, m = 0, day = 10) => Date.UTC(2026, 10, day, h, m) - IST; // IST clock time -> epoch

test('twice-a-day slots: due once per slot, never before the slot hour', () => {
  assert.equal(dueBySlots(at(6, 59), 0, [7, 17]), false);
  assert.equal(dueBySlots(at(7, 5), 0, [7, 17]), true);
  assert.equal(dueBySlots(at(7, 40), at(7, 5), [7, 17]), false);      // already ran in the 7:00 slot
  assert.equal(dueBySlots(at(17, 2), at(7, 5), [7, 17]), true);       // second slot opens
  assert.equal(dueBySlots(at(23, 0), at(17, 2), [7, 17]), false);
  assert.equal(dueBySlots(at(7, 1, 11), at(17, 2, 10), [7, 17]), true); // next morning
});

const good = {
  title: 'Best Oxidised Earrings for Women in India', slug: 'best-oxidised-earrings-for-women-india', focus_kw: 'oxidised earrings',
  excerpt: 'A simple guide to choosing oxidised earrings for daily wear, festive looks and gifting, with styling ideas.',
  body: 'Oxidised earrings suit almost every outfit.\n\n' + ('Short helpful sentence about styling and care. '.repeat(20) + '\n\n').repeat(2) +
    '## Why oxidised earrings work\n' + 'Text here. '.repeat(60) + '\n\n## How to style oxidised earrings\n' + 'More text. '.repeat(60) +
    '\n\n## Care tips\n' + 'Keep dry. '.repeat(60) + '\n\nSee [our earrings](/c/earrings) and [this pair](/p/12-jhumka).\n\n![Oxidised jhumka earrings](/img/x.jpg)\n' + 'Filler words. '.repeat(250),
};
test('seoCheck passes a well-formed post and reports a score', () => {
  const r = seoCheck(good);
  assert.deepEqual(r.blocking, []);
  assert.ok(r.score >= 70);
});
test('seoCheck blocks: keyword missing from title / first paragraph / headings, stuffing, no internal links, bad meta, empty alt', () => {
  assert.ok(seoCheck({ ...good, title: 'Pretty Ear Jewellery Ideas Everyone Loves' }).blocking.some((p) => /title/.test(p)));
  assert.ok(seoCheck({ ...good, body: good.body.replace('Oxidised earrings suit', 'These suit') }).blocking.some((p) => /first paragraph/.test(p)));
  assert.ok(seoCheck({ ...good, body: good.body.replace(/oxidised earrings/gi, 'ear pieces').replace('Oxidised', 'Ear') }).blocking.length > 0);
  assert.ok(seoCheck({ ...good, body: good.body + ' oxidised earrings'.repeat(80) }).blocking.some((p) => /stuff|density/.test(p)));
  assert.ok(seoCheck({ ...good, body: good.body.replace(/\]\(\/(c|p)\/[^)]*\)/g, '](#)') }).blocking.some((p) => /internal link/.test(p)));
  assert.ok(seoCheck({ ...good, excerpt: 'Too short.' }).blocking.some((p) => /meta description/.test(p)));
  assert.ok(seoCheck({ ...good, body: good.body.replace('![Oxidised jhumka earrings]', '![]') }).blocking.some((p) => /alt/.test(p)));
  assert.ok(seoCheck({ ...good, focus_kw: '' }).blocking.some((p) => /focus keyword/.test(p)));
});
test('seoCheck only advises (does not block) on missing outbound link', () => {
  const r = seoCheck(good);
  assert.ok(r.advice.some((a) => /outbound|external/.test(a)));
  assert.ok(!r.blocking.some((a) => /outbound|external/.test(a)));
});

test('parseFeed reads RSS and Atom items', () => {
  const rss = '<rss><channel><item><title><![CDATA[Fashion jewellery trend]]></title><link>https://a.com/1</link><pubDate>Mon, 23 Nov 2026 01:00:00 GMT</pubDate></item><item><title>Two &amp; three</title><link>https://a.com/2</link></item></channel></rss>';
  const atom = '<feed><entry><title>Atom post</title><link href="https://b.com/x"/><updated>2026-11-22T10:00:00Z</updated></entry></feed>';
  assert.deepEqual(parseFeed(rss).map((i) => [i.title, i.url]), [['Fashion jewellery trend', 'https://a.com/1'], ['Two & three', 'https://a.com/2']]);
  assert.deepEqual(parseFeed(atom).map((i) => [i.title, i.url]), [['Atom post', 'https://b.com/x']]);
  assert.deepEqual(parseFeed('<html>blocked</html>'), []);
});

test('Keyword Planner CSV import: finds columns, reads volume ranges and competition', () => {
  const csv = 'Keyword Stats 2025-11-01\nKeyword,Currency,Avg. monthly searches,Competition,Competition (indexed value)\noxidised earrings,INR,"10K – 100K",Low,12\nlayered necklace,INR,1K – 10K,Medium,40\njhumka,INR,100K – 1M,High,88\nbad row\n';
  const rows = parsePlannerCsv(csv);
  assert.deepEqual(rows.map((r) => [r.kw, r.volume, r.competition]), [['oxidised earrings', 10000, 'low'], ['layered necklace', 1000, 'medium'], ['jhumka', 100000, 'high']]);
  assert.deepEqual(parsePlannerCsv('nothing useful'), []);
});

test('topic picker prefers high volume with low or medium competition, never high', () => {
  const cands = [
    { kw: 'jhumka', score: 50, volume: 100000, competition: 'high' },
    { kw: 'oxidised earrings', score: 30, volume: 10000, competition: 'low' },
    { kw: 'layered necklace', score: 40, volume: 1000, competition: 'medium' },
    { kw: 'no data keyword', score: 99, volume: null, competition: null },
  ];
  assert.deepEqual(pickTopics(cands, 2).map((t) => t.kw), ['oxidised earrings', 'layered necklace']);
  const noData = pickTopics([{ kw: 'a', score: 5, volume: null }, { kw: 'b', score: 9, volume: null }], 1);
  assert.equal(noData[0].kw, 'b'); assert.match(noData[0].why, /no volume data/i);
});

test('playbook defines every agent the user asked for, each with role, when, steps and hand-off', () => {
  const need = ['market_watch', 'social_listening', 'insights', 'topic_planner', 'content_writer', 'social_visual', 'content_review', 'social_manager'];
  for (const id of need) { const d = DEFS[id]; assert.ok(d, id); for (const k of ['role', 'when', 'steps', 'gives', 'limits']) assert.ok(d[k] && d[k].length, id + '.' + k); }
  assert.ok(PLAYBOOK.length >= 8 && PLAYBOOK.every((p) => /^\d\d:\d\d$/.test(p.time) && DEFS[p.agent]));
  assert.deepEqual([...PLAYBOOK].sort((a, b) => a.time.localeCompare(b.time)), PLAYBOOK);
});

import { paaQuestions, buildBrief } from '../../src/intel.js';
test('people-also-ask style questions: question prefixes, relevant only, de-duplicated', async () => {
  const fake = async (q) => q.startsWith('how to') ? ['how to wear oxidised earrings', 'how to wear oxidised earrings', 'how to fix a car'] : q.startsWith('which') ? ['which oxidised earrings suit round face'] : [];
  const qs = await paaQuestions('oxidised earrings', fake);
  assert.deepEqual(qs, ['how to wear oxidised earrings', 'which oxidised earrings suit round face']);
});
test('brief gives the writer topic, question, title with the keyword, keywords and questions', () => {
  const b = buildBrief({ kw: 'oxidised earrings', questions: ['how to wear oxidised earrings', 'are oxidised earrings safe for sensitive skin'], related: ['oxidised earrings for women', 'oxidised jhumka'], why: 'x' });
  assert.equal(b.question, 'how to wear oxidised earrings');
  assert.ok(b.title.toLowerCase().includes('oxidised earrings') && b.title.length <= 66);
  assert.deepEqual(b.keywords.slice(0, 2), ['oxidised earrings', 'oxidised earrings for women']);
  assert.equal(b.questions.length, 2);
  assert.equal(buildBrief({ kw: 'claw clip' }).question.includes('claw clip'), true);
});

import { themeDigest } from '../../src/intel.js';
test('theme digest shows what competitors write about (gifting, festive, styling, care, trends, offers)', () => {
  const d = themeDigest(['Diwali jewellery gift ideas', 'How to style a claw clip', 'How to clean silver jewellery', 'Rakhi gifts for sister', 'Layering necklaces 2026 trend']);
  assert.deepEqual(d.map((x) => [x.theme, x.count]), [['Gifting and festive', 2], ['Styling guides', 1], ['Care and cleaning', 1], ['Trends', 1]].sort((a, b) => b[1] - a[1]));
  assert.deepEqual(themeDigest([]), []);
});
test('topic picker lifts topics competitors already write about when volumes tie', () => {
  const r = pickTopics([{ kw: 'a b', score: 1, volume: 1000, competition: 'low', competitor: false }, { kw: 'c d', score: 1, volume: 1000, competition: 'low', competitor: true }], 1);
  assert.equal(r[0].kw, 'c d'); assert.match(r[0].why, /competitors/i);
});

import { parsePlannerCsv as _ppc, pickTopics as _pick } from '../../src/intel.js';
test('range volumes are marked approximate and worded as "at least"', () => {
  const rows = _ppc('Keyword,Avg. monthly searches,Competition\nbangles set,10K – 100K,Medium\npotli bag,1K,Low\n');
  assert.equal(rows[0].volume, 10000); assert.equal(rows[0].approx, true); assert.equal(rows[1].approx, false);
  const p = _pick([{ kw: 'bangles set', volume: 10000, competition: 'medium', approx: true, score: 1 }], 1);
  assert.match(p[0].why, /At least 10,000/);
});
