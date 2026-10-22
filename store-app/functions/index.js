import { getSettings, activeProducts, publicProduct, categoriesOf } from '../src/store.js';
import { SITE, esc, rich, headTags, ld, organizationLd, websiteLd, faqLd, itemListLd, cardHtml, footerHtml, faqHtml, aboutHtml, tryTeaserHtml, headerHtml, etaHtml, payMethodsHtml } from '../src/seo.js';

// Home page: the static page, with real content and structured data filled in on the server
// so search engines and AI assistants see everything without running JavaScript.
export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  if (!res.headers.get('content-type')?.includes('text/html')) return res;
  let rows, S;
  try { [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]); } catch { return res; }
  const prods = rows.map(publicProduct), cats = categoriesOf(rows, S), closed = !S.store.open;
  const h = S.hero;
  const head = headTags({ title: S.seo.title, description: S.seo.description, canonical: SITE + '/', image: S.seo.ogImage || prods.find((p) => p.image)?.image })
    .replace(/<title>.*<\/title>\n/, '');
  const jsonld = [organizationLd(S), websiteLd(S), itemListLd(rows), faqLd(S.faq)].filter(Boolean).map(ld).join('\n');

  // Home layout: product collage in the hero, category tiles, and a mixed "featured" grid (full lists live on collection pages).
  const withImg = prods.filter((p) => p.image);
  const byCat = cats.map((c) => withImg.filter((p) => p.room === c.name));
  const featured = []; for (let i = 0; featured.length < 12 && i < 12; i++) for (const l of byCat) if (l[i] && featured.length < 12) featured.push(l[i]);
  const shown = featured.length >= 4 ? featured : prods;
  const collage = withImg.length >= 3 ? `<div class="collage">${[0, 1, 2].map((i) => { const p = featured[i] || withImg[i]; return `<a href="${esc(p.url)}" aria-label="${esc(p.name)}"><img src="${esc(p.image)}" alt="" width="400" height="640" decoding="async"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></a>`; }).join('')}</div>` : null;
  const tiles = cats.map((c, i) => ({ c, p: byCat[i][0], n: rows.filter((r) => r.category === c.name).length })).filter((t) => t.p);
  const catsec = tiles.length ? `<div class="cats">${tiles.map((t) => `<a class="cattile" href="${esc(t.c.path)}"><img src="${esc(t.p.image)}" alt="" loading="lazy" width="600" height="450"><span class="catcap"><b>${esc(t.c.name)}</b><small>${t.n} styles</small></span></a>`).join('')}</div>` : '';
  const set = (html) => ({ element(e) { e.setInnerContent(html, { html: true }); } });
  const out = new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(S.seo.title); } })
    .on('head', { element(e) { e.append(head + '\n' + jsonld, { html: true }); } })
    .on('#announce', { element(e) { if (S.announcement.enabled && S.announcement.text) { e.removeAttribute('hidden'); e.setInnerContent(S.announcement.text); } } })
    .on('#closedbar', { element(e) { if (closed) { e.removeAttribute('hidden'); e.setInnerContent(S.store.closedMessage); } } })
    .on('header.bar', { element(e) { e.replace(headerHtml(S, cats), { html: true }); } })
    .on('#heroArt', { element(e) { if (collage) { e.setInnerContent(collage, { html: true }); e.setAttribute('class', 'arch wide'); e.removeAttribute('aria-hidden'); } } })
    .on('#catsec', set(catsec))
    .on('#payBand', set(`<div class="wrap"><h2>Pay your way</h2><p>Pay securely online by UPI, credit or debit card, or net banking. Payments are processed by Razorpay.</p>${payMethodsHtml()}<p>Delivered within 10 to 20 days of your order, with your expected delivery date shown at checkout.</p></div>`))
    .on('#heroEyebrow', { element(e) { e.setInnerContent(h.eyebrow); } })
    .on('#heroH1', set(esc(h.headline) + (h.accent ? ' <em>' + esc(h.accent) + '</em>' : '')))
    .on('#heroText', { element(e) { e.setInnerContent(h.text); } })
    .on('#heroCta', { element(e) { e.setInnerContent(h.ctaLabel); e.setAttribute('href', h.ctaLink || '#shop'); } })
    .on('#heroFacts', set(h.facts.filter(Boolean).map((f) => `<span>${rich(f)}</span>`).join('')))
    .on('#shopLabel', { element(e) { e.setInnerContent(S.collection.label); } })
    .on('#shopTitle', { element(e) { e.setInnerContent(S.collection.title); } })
    .on('#grid', { element(e) { e.setInnerContent(shown.map((p) => cardHtml(p, closed)).join(''), { html: true });
      e.after(`<nav class="catlinks wrap" aria-label="Collections">${cats.map((c) => `<a href="${esc(c.path)}">${esc(c.name)}</a>`).join('')}</nav>`, { html: true }); } })
    .on('#promiseWrap', set(S.promise.map((x) => `<div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join('')))
    .on('#promise', { element(e) { e.after(tryTeaserHtml() + aboutHtml(S) + faqHtml(S.faq), { html: true }); } })
    .on('#footerEl', { element(e) { e.replace(footerHtml(S, cats), { html: true }); } })
    .transform(res);
  const r = new Response(out.body, out);
  r.headers.set('Cache-Control', 'public, max-age=60');
  return r;
}
