import { getSettings, activeProducts, publicProduct, categoriesOf } from '../../src/store.js';
import { SITE, trim, headTags, pageShell, breadcrumbLd, itemListLd, cardHtml } from '../../src/seo.js';
import { BANDS, bandById, bandPath, inBand } from '../../src/budget.js';

// /price/500-699 — products in that price range only, cheapest first.
export async function onRequestGet({ params, env }) {
  const b = bandById(params.range);
  if (!b) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const prods = inBand(rows.map(publicProduct), b).sort((x, y) => x.price - y.price);
  const url = SITE + bandPath(b);
  const title = trim(`Jewellery, hair accessories and beauty tools ${b.label.toLowerCase()} | WinkCasa`, 70);
  const desc = trim(`${prods.length} styles priced ${b.label.toLowerCase()} at WinkCasa: earrings, hair accessories, beauty tools and more. Free delivery above ₹${S.shipping.freeShippingAbove}.`, 160);
  const chips = `<a class="chip" href="/#shop">All prices</a>` + BANDS.map((x) => `<a class="chip${x === b ? ' on' : ''}" href="${bandPath(x)}"${x === b ? ' aria-current="page"' : ''}>${x.label}</a>`).join('');
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>${b.label}</span></nav>
<div class="cathead"><p class="label">Shop by price</p><h1>${b.label}</h1><p>${prods.length} styles, cheapest first. Free delivery on orders above ₹${S.shipping.freeShippingAbove}, so two or three pieces together often ship free.</p></div>
<nav class="chips" aria-label="Filter by price"><span>Price</span>${chips}</nav>
<div class="grid">${prods.map((p) => cardHtml(p, !S.store.open)).join('') || '<p class="dim">No products in this range yet.</p>'}</div></main>`;
  const html = pageShell({
    head: headTags({ title, description: desc, canonical: url, image: prods[0]?.image || S.seo.ogImage }),
    S, cats, main,
    jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: b.label, url }]), itemListLd(prods.map((p) => ({ ...p })))],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
