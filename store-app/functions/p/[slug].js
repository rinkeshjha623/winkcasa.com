import { getSettings, activeProducts, parseProduct, publicProduct, categoriesOf, productPath, slugify } from '../../src/store.js';
import { SITE, esc, abs, trim, headTags, pageShell, breadcrumbLd, productLd, faqLd, cardHtml, etaHtml, payMethodsHtml, shareHtml, askHtml } from '../../src/seo.js';

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

  const ico = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const trust = [['Easy returns', '7-day replace or refund', ico('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>')], ['Secure checkout', 'UPI, cards, net banking', ico('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>')],
    ['Delivery across India', '10 to 20 days', ico('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>')], ['Buyer protection', 'Damaged or wrong? We fix it', ico('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>')]];
  const specs = [['SKU', p.sku || p.id], ['Category', p.category], p.material && ['Material', p.material], p.brand && ['Brand', p.brand], ['Sold by', 'WinkCasa Retail, New Delhi']].filter(Boolean);
  const fee = money(S.shipping.charge), free = money(S.shipping.freeShippingAbove);
  const buy = inStock && S.store.open
    ? `<div class="qtyrow"><label for="pqty">Quantity</label><div class="qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><input id="pqty" type="number" inputmode="numeric" min="1" max="10" value="1" aria-label="Quantity"><button type="button" data-q="1" aria-label="Increase quantity">+</button></div></div>
<button class="btn wide" data-add="${p.id}">Add to cart</button><button class="btn alt wide" data-buy="${p.id}">Buy now</button><button class="btn alt wide wl" data-wish="${p.id}" aria-label="Save to wishlist">♡ Save to wishlist</button>`
    : `<span class="btn off wide">${inStock ? 'Unavailable' : 'Sold out'}</span>`;
  const main = `<main class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${esc(cat.path)}">${esc(p.category)}</a> › <span>${esc(p.name)}</span></nav>
<div class="pp">
<div class="gal2">${imgs.length > 1 ? `<div class="rail" role="list">${imgs.map((u, i) => `<button type="button" class="rt${i === 0 ? ' on' : ''}" data-src="${esc(u)}" aria-label="Show photo ${i + 1}"><img src="${esc(u)}" alt="" width="64" height="80" loading="${i < 4 ? 'eager' : 'lazy'}"></button>`).join('')}</div>` : ''}
<div class="zoom" id="zoom">${imgs[0] ? `<img id="zimg" src="${esc(imgs[0])}" alt="${esc(p.img_alt || p.name)}" width="800" height="1000" fetchpriority="high">` : ''}${off ? `<span class="ribbon">${off}% off</span>` : ''}<span class="zhint">Hover to zoom</span></div></div>
<div class="info"><p class="label"><a href="${esc(cat.path)}" style="text-decoration:none">${esc(p.category)}</a></p><h1>${esc(p.name)}</h1>
<p class="skul">SKU <b>${esc(p.sku || p.id)}</b>${p.brand ? ` · Brand <b>${esc(p.brand)}</b>` : ''}</p>${p.ai_answer ? `<p class="qa">${esc(p.ai_answer)}</p>` : ''}
<div class="prow">${off ? `<span class="pct">−${off}%</span>` : ''}<span class="pbig">${money(p.price)}</span></div>
${p.mrp > p.price ? `<p class="mrp">M.R.P.: <s>${money(p.mrp)}</s></p>` : ''}
<p class="tax">Inclusive of all taxes · ${S.shipping.freeShippingAbove ? `Free delivery above ${free}, otherwise ${fee}` : 'Delivery across India'}</p>
<div class="trust">${trust.map(([a, b, i]) => `<div>${i}<b>${a}</b><span>${b}</span></div>`).join('')}</div>
<div class="spec"><p class="stock ${inStock ? 'in' : 'out'}">${inStock ? 'In stock' : 'Sold out'}</p><dl>${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
${p.description ? `<p class="lead">${esc(p.description)}</p>` : ''}
${p.highlights.length ? `<h2 class="mini">About this item</h2><ul class="hl">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
${shareHtml({ url, title: p.name, image: imgs[0], text: p.name + ' on WinkCasa' })}${askHtml(S, p.name)}</div>
<aside class="bbox" id="bbox"><p class="pbig">${money(p.price)}</p><p class="tax">Inclusive of all taxes</p>
<div class="dlv"><b>Delivery</b>${etaHtml()}<span>Shipping and handling are included above ${free}.</span></div>
<p class="stock ${inStock ? 'in' : 'out'}">${inStock ? 'In stock' : 'Sold out'}</p>${buy}
<p class="sold">Sold by <b>WinkCasa Retail</b>, New Delhi<br>GSTIN ${esc(S.business?.gstin || '07AURPJ3347A1ZQ')}</p>${payMethodsHtml()}</aside>
</div>
<div class="pdesc"><div>
${paras.length ? `<section class="sec"><h2>Product description</h2>${paras.map((t) => `<p>${esc(t)}</p>`).join('')}</section>` : ''}
<section class="sec"><h2>Delivery &amp; returns</h2><p>Delivered within <b>10 to 20 days</b> of your order, across India. Your expected dates are shown at checkout and in your order email. Delivery is free above ${free} and ${fee} below that.</p><p>If an item arrives damaged, defective or wrong, tell us within 7 days and we will replace it or refund you. See our <a href="/returns">Returns page</a> and <a href="/shipping">Shipping page</a>.</p></section></div>
<aside class="why"><h3>Why buy from WinkCasa</h3><ul><li>Prices include GST and are shown in rupees</li><li>Secure payment by UPI, card or net banking through Razorpay</li><li>7-day replace or refund for damaged, defective or wrong items</li><li>A real New Delhi business that answers every message within one working day</li></ul><a class="btn alt" href="/contact">Contact us</a></aside></div>
<section class="faq" id="faq"><h2>Questions about ${esc(p.name)}</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>
${related.length ? `<section class="sec"><h2>Customers who viewed this also viewed</h2><div class="grid" style="padding-block:20px 0">${related.map((r) => cardHtml(r, !S.store.open)).join('')}</div></section>` : ''}
${inStock && S.store.open ? `<div class="stickybuy" id="sbuy"><div><b>${money(p.price)}</b>${off ? `<s>${money(p.mrp)}</s>` : ''}</div><button class="btn" data-add="${p.id}">Add to cart</button></div>` : ''}
</main>`;

  const html = pageShell({
    head: headTags({ title, description: desc, canonical: url, image: imgs[0] || S.seo.ogImage, type: 'product', noindex: !!p.noindex }),
    S, cats, main,
    jsonld: [productLd(p, S), breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: p.category, url: SITE + cat.path }, { name: p.name, url }]), faqLd(faqs)],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
