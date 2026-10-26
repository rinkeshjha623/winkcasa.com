import { getSettings, activeProducts, publicProduct, categoriesOf } from '../../src/store.js';
import { SITE, esc, trim, headTags, pageShell, breadcrumbLd, itemListLd, cardHtml, faqLd } from '../../src/seo.js';
import { catInfo } from '../../src/category-seo.js';

// /c/skincare  — category landing page, server-rendered.
export async function onRequestGet({ params, env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const cat = cats.find((c) => c.slug === params.slug);
  if (!cat) return new Response('Category not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const list = rows.filter((r) => r.category === cat.name);
  const prods = list.map(publicProduct);
  const url = SITE + cat.path;
  const info = catInfo(cat.name);
  const title = trim(`${info?.title || cat.name + ' online in India'} | WinkCasa`, 70);
  const desc = trim(`${cat.description} ${list.length} product${list.length === 1 ? '' : 's'}, free delivery above ₹${S.shipping.freeShippingAbove}.`, 160);
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>${esc(cat.name)}</span></nav>
<div class="cathead"><p class="label">Collection</p><h1>${esc(cat.name)}</h1><p>${esc(cat.description)}</p></div>
<div class="grid">${prods.map((p) => cardHtml(p, !S.store.open)).join('') || '<p class="dim">No products in this collection yet.</p>'}</div>
${info ? `<section class="catinfo" style="max-width:70ch;margin:40px 0"><h2>About ${esc(cat.name)} at WinkCasa</h2>${info.intro.map((t) => `<p>${esc(t)}</p>`).join('')}<h2>Frequently asked questions</h2>${info.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>` : ''}</main>`;
  const html = pageShell({
    head: headTags({ title, description: desc, canonical: url, image: prods[0]?.image || S.seo.ogImage }),
    S, cats, main,
    jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: cat.name, url }]), itemListLd(list.map((r) => ({ ...r }))), ...(info ? [faqLd(info.faqs.map(([q, a]) => ({ q, a })))] : [])],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
