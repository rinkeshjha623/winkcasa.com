import { getSettings, activeProducts, parseProduct, publicProduct, categoriesOf, productPath, slugify } from '../../src/store.js';
import { SITE, esc, abs, trim, headTags, pageShell, breadcrumbLd, productLd, faqLd, cardHtml, etaHtml, payMethodsHtml } from '../../src/seo.js';

const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
const notFound = () => new Response('Product not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });

// /p/12-vitamin-c-serum  — server-rendered so search engines and AI assistants can read it.
export async function onRequestGet({ params, env }) {
  const id = parseInt(String(params.slug), 10);
  if (!id) return notFound();
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const row = rows.find((r) => r.id === id);
  if (!row) return notFound();
  const p = parseProduct(row);
  const want = productPath(p).slice(3);
  if (params.slug !== want) return Response.redirect(SITE + productPath(p), 301);

  const cats = categoriesOf(rows, S);
  const cat = cats.find((c) => c.name === p.category);
  const url = SITE + productPath(p);
  const inStock = p.stock === null || p.stock > 0;
  const off = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const title = trim(p.seo_title || `${p.name} | ${p.category} | WinkCasa`, 70);
  const desc = trim(p.seo_description || `${p.name}${p.description ? ' – ' + p.description : ''}. ${money(p.price)}. ${S.shipping.freeShippingAbove ? `Free delivery above ${money(S.shipping.freeShippingAbove)} across India.` : 'Delivery across India.'}`, 160);
  const faqs = [...p.faq, ...S.faq.slice(0, 3)];
  const related = rows.filter((r) => r.category === p.category && r.id !== p.id).slice(0, 4).map(publicProduct);
  const imgs = p.images;
  const paras = (p.details || '').split(/\n{2,}/).filter(Boolean);

  const main = `<main class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${esc(cat.path)}">${esc(p.category)}</a> › <span>${esc(p.name)}</span></nav>
<div class="pgrid"><div class="gal"><div class="main">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}" width="800" height="1000" fetchpriority="high">` : ''}</div>${imgs.length > 1 ? `<div class="thumbs">${imgs.slice(1).map((u) => `<img src="${esc(u)}" alt="${esc(p.name)} view" loading="lazy" width="64" height="80">`).join('')}</div>` : ''}</div>
<div class="info"><p class="label"><a href="${esc(cat.path)}" style="text-decoration:none">${esc(p.category)}</a></p><h1>${esc(p.name)}</h1>
<p class="pr">${money(p.price)}${p.mrp > p.price ? ` <s>${money(p.mrp)}</s><span class="off">${off}% off</span>` : ''}</p>
<p class="avail">${inStock ? 'In stock' : 'Sold out'} · Inclusive of GST</p>
${p.description ? `<p>${esc(p.description)}</p>` : ''}
${inStock && S.store.open ? `<div class="buybtns"><button class="btn" data-add="${p.id}">Add to cart</button><button class="btn alt" data-buy="${p.id}">Buy now</button></div>` : `<span class="btn off">${inStock ? 'Unavailable' : 'Sold out'}</span>`}
${etaHtml()}${payMethodsHtml()}
${p.highlights.length ? `<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
<ul class="facts2"><li>Delivery across India: free above ${money(S.shipping.freeShippingAbove)}, otherwise ${money(S.shipping.charge)}</li><li>Delivered within 3–7 days of your order</li><li><a href="/returns">7-day returns</a> on damaged, defective or wrong items</li>${p.brand ? `<li>Brand: ${esc(p.brand)}</li>` : ''}<li>SKU: ${esc(p.sku || p.id)}</li></ul></div></div>
${paras.length ? `<section class="sec"><h2>About this product</h2>${paras.map((t) => `<p>${esc(t)}</p>`).join('')}</section>` : ''}
<section class="faq" id="faq"><h2>Questions about ${esc(p.name)}</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>
${related.length ? `<section class="sec"><h2>More in ${esc(p.category)}</h2><div class="grid" style="padding-block:20px 0">${related.map((r) => cardHtml(r, !S.store.open)).join('')}</div></section>` : ''}
</main>`;

  const html = pageShell({
    head: headTags({ title, description: desc, canonical: url, image: imgs[0] || S.seo.ogImage, type: 'product' }),
    S, cats, main,
    jsonld: [productLd(p, S), breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: p.category, url: SITE + cat.path }, { name: p.name, url }]), faqLd(faqs)],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
