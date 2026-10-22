import { getSettings, activeProducts, publicProduct, categoriesOf } from '../src/store.js';
import { SITE, esc, rich, headTags, ld, organizationLd, websiteLd, faqLd, itemListLd, cardHtml, footerHtml, faqHtml, aboutHtml, navHtml } from '../src/seo.js';

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

  const set = (html) => ({ element(e) { e.setInnerContent(html, { html: true }); } });
  const out = new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(S.seo.title); } })
    .on('head', { element(e) { e.append(head + '\n' + jsonld, { html: true }); } })
    .on('#announce', { element(e) { if (S.announcement.enabled && S.announcement.text) { e.removeAttribute('hidden'); e.setInnerContent(S.announcement.text); } } })
    .on('#closedbar', { element(e) { if (closed) { e.removeAttribute('hidden'); e.setInnerContent(S.store.closedMessage); } } })
    .on('#navlinks', set(navHtml(S, true)))
    .on('#heroEyebrow', { element(e) { e.setInnerContent(h.eyebrow); } })
    .on('#heroH1', set(esc(h.headline) + (h.accent ? ' <em>' + esc(h.accent) + '</em>' : '')))
    .on('#heroText', { element(e) { e.setInnerContent(h.text); } })
    .on('#heroCta', { element(e) { e.setInnerContent(h.ctaLabel); e.setAttribute('href', h.ctaLink || '#shop'); } })
    .on('#heroFacts', set(h.facts.filter(Boolean).map((f) => `<span>${rich(f)}</span>`).join('')))
    .on('#shopLabel', { element(e) { e.setInnerContent(S.collection.label); } })
    .on('#shopTitle', { element(e) { e.setInnerContent(S.collection.title); } })
    .on('#grid', { element(e) { e.setInnerContent(prods.map((p) => cardHtml(p, closed)).join(''), { html: true });
      e.after(`<nav class="catlinks wrap" aria-label="Collections">${cats.map((c) => `<a href="${esc(c.path)}">${esc(c.name)}</a>`).join('')}</nav>`, { html: true }); } })
    .on('#promiseWrap', set(S.promise.map((x) => `<div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join('')))
    .on('#promise', { element(e) { e.after(aboutHtml(S) + faqHtml(S.faq), { html: true }); } })
    .on('#footerEl', { element(e) { e.replace(footerHtml(S, cats), { html: true }); } })
    .transform(res);
  const r = new Response(out.body, out);
  r.headers.set('Cache-Control', 'public, max-age=60');
  return r;
}
