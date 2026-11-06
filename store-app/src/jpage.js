import { getSettings, activeProducts, publicProduct, categoriesOf } from './store.js';
import { SITE, esc, trim, headTags, pageShell, breadcrumbLd, itemListLd, cardHtml, faqLd } from './seo.js';
import { JTYPES, JTYPE_ORDER } from './jtypes.js';

// Renders /earrings-for-women, /pearl-earrings, /necklaces-for-women ... server-side.
export async function jtypePage(slug, env) {
  const T = JTYPES[slug];
  if (!T) return new Response('Not found', { status: 404 });
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const list = rows.filter((r) => r.category === 'Jewellery' && T.match(r.name));
  if (list.length < 3) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const cats = categoriesOf(rows, S);
  const prods = list.map(publicProduct);
  const url = SITE + '/' + slug;
  const others = JTYPE_ORDER.filter((k) => k !== slug && rows.some((r) => r.category === 'Jewellery' && JTYPES[k].match(r.name)));
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/c/jewellery">Jewellery</a> › <span>${esc(T.h1)}</span></nav>
<div class="cathead"><p class="label">Jewellery</p><h1>${esc(T.h1)}</h1><p>${esc(T.intro[0])}</p></div>
<div class="grid">${prods.map((p) => cardHtml(p, !S.store.open)).join('')}</div>
<section class="catinfo" style="max-width:70ch;margin:40px 0"><h2>${esc(T.h1)}: how to choose</h2>${T.intro.slice(1).map((t) => `<p>${esc(t)}</p>`).join('')}<p>Delivery is across India in 10 to 20 days, free above ₹${S.shipping.freeShippingAbove}. Items that arrive damaged, defective or wrong can be returned within 7 days.</p><h2>Frequently asked questions</h2>${T.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}<h2>More jewellery</h2><p>${others.map((k) => `<a href="/${k}">${esc(JTYPES[k].h1)}</a>`).join(' · ')} · <a href="/c/jewellery">All jewellery</a></p></section></main>`;
  const html = pageShell({
    head: headTags({ title: trim(`${T.title} | WinkCasa`, 70), description: trim(T.desc, 160), canonical: url, image: prods[0]?.image || S.seo.ogImage }),
    S, cats, main,
    jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Jewellery', url: SITE + '/c/jewellery' }, { name: T.h1, url }]), itemListLd(list.map((r) => ({ ...r }))), faqLd(T.faqs.map(([q, a]) => ({ q, a })))],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
