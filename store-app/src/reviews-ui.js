import { esc } from './seo.js';

export const starsHtml = (avg) => `<span class="stars" role="img" aria-label="Rated ${avg} out of 5"><i style="width:${Math.round((avg / 5) * 100)}%"></i></span>`;
const fmt = (d) => new Date(String(d).replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Reviews section for a product page. Pinned first, then newest. Everything is escaped.
export function reviewsSectionHtml(rv) {
  if (!rv || !rv.n) return `<section class="sec reviews" id="reviews"><h2>Customer reviews</h2><p class="muted">No reviews yet. Bought this? Rate your delivered order from <a href="/track">Track order</a> and your review will appear here.</p></section>`;
  const list = [...rv.list].sort((a, b) => (b.pinned - a.pinned) || (String(b.created_at) > String(a.created_at) ? 1 : -1));
  return `<section class="sec reviews" id="reviews"><h2>Customer reviews</h2>
<div class="rsum">${starsHtml(rv.avg)}<b>${rv.avg}</b> out of 5 <span class="muted">· ${rv.n} review${rv.n === 1 ? '' : 's'}</span></div>
${list.map((r) => `<article class="rev"><div class="rh">${starsHtml(r.rating)}<b>${esc(r.name)}</b>${r.verified ? '<em class="vb">Verified buyer</em>' : '<em class="vb m">Customer message</em>'}<span class="muted">${esc(fmt(r.created_at))}</span></div>${r.text ? `<p>${esc(r.text)}</p>` : ''}${r.reply ? `<p class="rrep"><b>WinkCasa:</b> ${esc(r.reply)}</p>` : ''}</article>`).join('')}</section>`;
}
