// Rank Math-style checklist run by the final review before a blog post can go live.
// "blocking" problems stop publishing. "advice" is shown to the owner but never blocks.
import { slugify } from './store.js';

const words = (s) => String(s || '').split(/\s+/).filter(Boolean);
export function seoCheck(p) {
  const kw = String(p.focus_kw || '').trim().toLowerCase();
  const body = String(p.body || ''), title = String(p.title || ''), excerpt = String(p.excerpt || '');
  const blocking = [], advice = [];
  const lower = body.toLowerCase();
  if (!kw) blocking.push('no focus keyword set');
  else {
    if (!title.toLowerCase().includes(kw)) blocking.push('focus keyword missing from the title');
    const first = body.split(/\n\s*\n/).map((x) => x.trim()).find((x) => x && !x.startsWith('#')) || '';
    if (!first.toLowerCase().includes(kw)) blocking.push('focus keyword missing from the first paragraph');
    const heads = (body.match(/^#{2,3} .+$/gm) || []).join(' ').toLowerCase();
    if (!heads.includes(kw)) blocking.push('focus keyword missing from every section heading');
    const n = lower.split(kw).length - 1, total = words(body).length || 1;
    const density = (n * words(kw).length / total) * 100;
    if (density > 3) blocking.push(`keyword stuffing (density ${density.toFixed(1)}%, keep under 3%)`);
    if (!String(p.slug || '').includes(slugify(kw))) advice.push('the web address does not contain the focus keyword');
  }
  const internal = (body.match(/\]\((\/(p|c|blog)\/[^)\s]*|https:\/\/www\.winkcasa\.com[^)\s]*)\)/g) || []).length;
  if (internal < 2) blocking.push(`fewer than 2 internal links (has ${internal})`);
  if (excerpt.length < 80 || excerpt.length > 165) blocking.push(`meta description should be 80 to 165 characters (has ${excerpt.length})`);
  if (/!\[\s*\]\(/.test(body)) blocking.push('an image has no alt text');
  const external = (body.match(/\]\(https?:\/\/(?!www\.winkcasa\.com)[^)\s]+\)/g) || []).length;
  if (!external) advice.push('no outbound link: add one to a trusted source if a real one fits (not required)');
  if (words(body).length < 800) advice.push(`${words(body).length} words: 800+ ranks better for guides`);
  if (!/!\[[^\]]+\]\(/.test(body)) advice.push('no image in the text (the visual expert adds a cover)');
  if (title.length < 30 || title.length > 62) advice.push('title is best at 30 to 62 characters');
  const score = Math.max(0, 100 - blocking.length * 15 - advice.length * 5);
  return { score, blocking, advice };
}
