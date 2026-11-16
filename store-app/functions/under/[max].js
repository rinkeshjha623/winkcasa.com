import { getSettings, activeProducts, publicProduct, categoriesOf } from '../../src/store.js';
import { SITE, esc, trim, headTags, pageShell, breadcrumbLd, itemListLd, cardHtml } from '../../src/seo.js';
import { BANDS, bandPath, inBand } from '../../src/budget.js';

// /under/499 — everything priced at or below that amount, cheapest first.
export async function onRequestGet({ params, env }) {
  const n = Number(params.max);
  if (!BANDS.includes(n)) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const prods = inBand(rows.map(publicProduct), n).sort((a, b) => a.price - b.price);
  const url = SITE + bandPath(n);
  const title = trim(`Jewellery, hair accessories and beauty tools under ₹${n} | WinkCasa`, 70);
  const desc = trim(`${prods.length} styles under ₹${n} at WinkCasa: earrings, hair accessories, beauty tools and more. Free delivery above ₹${S.shipping.freeShippingAbove}.`, 160);
  const chips = `<a class="chip" href="/#shop">All prices</a>` + BANDS.map((b) => `<a class="chip${b === n ? ' on' : ''}" href="${bandPath(b)}"${b === n ? ' aria-current="page"' : ''}>Under ₹${b}</a>`).join('');
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Under ₹${n}</span></nav>
<div class="cathead"><p class="label">Shop by budget</p><h1>Under ₹${n}</h1><p>${prods.length} styles at ₹${n} or less, cheapest first. Free delivery on orders above ₹${S.shipping.freeShippingAbove}, so two or three pieces together often ship free.</p></div>
<nav class="chips" aria-label="Filter by price"><span>Price</span>${chips}</nav>
<div class="grid">${prods.map((p) => cardHtml(p, !S.store.open)).join('') || '<p class="dim">No products in this range yet.</p>'}</div></main>`;
  const html = pageShell({
    head: headTags({ title, description: desc, canonical: url, image: prods[0]?.image || S.seo.ogImage }),
    S, cats, main,
    jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: `Under ₹${n}`, url }]), itemListLd(prods.map((p) => ({ ...p })))],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
