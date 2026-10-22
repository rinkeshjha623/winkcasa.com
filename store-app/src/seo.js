import { productPath, categoryPath, slugify } from './store.js';

export const SITE = 'https://www.winkcasa.com';

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rich = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
export const abs = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u));
export const trim = (t, n) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const okHref = (h) => (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(h || '') ? h : '#');
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

export const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export function headTags({ title, description, canonical, image, type = 'website', noindex = false }) {
  const img = abs(image);
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'}">
<meta name="theme-color" content="#0B1916">
<meta property="og:site_name" content="WinkCasa">
<meta property="og:locale" content="en_IN">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${img ? `<meta property="og:image" content="${esc(img)}">` : ''}
<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${img ? `<meta name="twitter:image" content="${esc(img)}">` : ''}`;
}

const sameAs = (S) => Object.values(S.social).filter((u) => /^https?:\/\//.test(u));

export function organizationLd(S) {
  const b = S.business;
  return {
    '@context': 'https://schema.org', '@type': 'OnlineStore', '@id': SITE + '/#organization',
    name: 'WinkCasa', legalName: b.legalName, url: SITE + '/', description: S.seo.description,
    logo: SITE + '/icon.svg', email: b.email, telephone: b.phone, taxID: b.gstin || undefined,
    areaServed: { '@type': 'Country', name: 'India' }, currenciesAccepted: 'INR', priceRange: '₹₹',
    address: { '@type': 'PostalAddress', streetAddress: b.street, addressLocality: b.city, addressRegion: b.state, postalCode: b.postcode, addressCountry: 'IN' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: b.email, telephone: b.phone, areaServed: 'IN', availableLanguage: ['en', 'hi'] },
    openingHours: b.hours || undefined,
    sameAs: sameAs(S).length ? sameAs(S) : undefined,
  };
}
export const websiteLd = (S) => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'WinkCasa', inLanguage: 'en-IN', publisher: { '@id': SITE + '/#organization' } });

export const faqLd = (list) => list.length ? ({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) : null;

export const breadcrumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) });

export const itemListLd = (products) => ({ '@context': 'https://schema.org', '@type': 'ItemList',
  itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + productPath(p), name: p.name })) });

export function productLd(p, S) {
  const imgs = p.images.map(abs);
  const inStock = p.stock === null || p.stock > 0;
  const until = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return {
    '@context': 'https://schema.org', '@type': 'Product', '@id': SITE + productPath(p) + '#product',
    name: p.name, description: p.seo_description || p.description || p.name, sku: p.sku || String(p.id),
    category: p.category, image: imgs.length ? imgs : undefined,
    brand: { '@type': 'Brand', name: p.brand || 'WinkCasa' },
    offers: {
      '@type': 'Offer', url: SITE + productPath(p), priceCurrency: 'INR', price: String(p.price), priceValidUntil: until,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': SITE + '/#organization' },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: String(S.shipping.charge), currency: 'INR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
        deliveryTime: { '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' } },
      },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'IN', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 7, url: SITE + '/returns' },
    },
  };
}

/* ---------- shared HTML pieces (used by home, product and category pages) ---------- */
export function headerHtml(S, cats = []) {
  const shop = cats.map((c) => `<a href="${esc(c.path)}">${esc(c.name)}</a>`).join('');
  const links = [['/', 'Home'], ['/#shop', 'Shop'], ['/blog', 'Blog'], ['/about', 'About us'], ['/contact', 'Contact us']];
  return `<header class="bar"><div class="navwrap"><nav class="nav" aria-label="Main">
<a href="/">Home</a>
<div class="dd"><a href="/#shop" aria-haspopup="true">Categories ▾</a><div class="ddl"><a href="/#shop">All products</a>${shop}</div></div>
<a href="/blog">Blog</a><a href="/about">About us</a><a href="/contact">Contact us</a></nav>
<details class="mmenu"><summary>Menu</summary><div class="mlist"><a href="/">Home</a>${shop}<a href="/#shop">All products</a><a href="/blog">Blog</a><a href="/about">About us</a><a href="/contact">Contact us</a><a href="/track">Track your order</a></div></details></div>
<a class="logo" href="/" aria-label="WinkCasa">W<span class="idot">ı</span>nkCasa</a><a class="cartbtn" href="/cart" aria-label="View cart">Cart <b data-cartcount>0</b></a></header>`;
}

export const payMethodsHtml = () => `<div class="paym" aria-label="Payment options"><span class="pm">UPI</span><span class="pm">Credit &amp; debit cards</span><span class="pm">Net banking</span><span class="pms">Secure payment by Razorpay</span></div>`;
export const etaHtml = () => `<p class="eta" data-eta>Delivered within <b>3–7 days</b> of your order.</p>`;

export function footerHtml(S, cats) {
  const b = S.business, f = S.footer;
  const social = [['Instagram', S.social.instagram], ['Facebook', S.social.facebook], ['YouTube', S.social.youtube], ['WhatsApp', S.social.whatsapp]].filter(([, u]) => u);
  return `<footer id="footerEl" class="sitefoot"><div class="fcols">
<div><div class="flogo">WinkCasa</div><address>${esc(b.legalName)}<br>${esc(b.street)}, ${esc(b.city)}, ${esc(b.state)} ${esc(b.postcode)}, India<br>Phone: <a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a><br>Email: <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.gstin ? `<br>GSTIN: ${esc(b.gstin)}` : ''}</address></div>
<div><h4>Shop</h4><ul><li><a href="/#shop">All products</a></li>${cats.map((c) => `<li><a href="${esc(c.path)}">${esc(c.name)}</a></li>`).join('')}</ul></div>
<div><h4>Help</h4><ul>${f.links.map((l) => `<li><a href="${esc(okHref(l.href))}">${esc(l.label)}</a></li>`).join('')}</ul></div>
${social.length ? `<div><h4>Follow us</h4><ul>${social.map(([n, u]) => `<li><a href="${esc(u)}" rel="noopener me">${n}</a></li>`).join('')}</ul></div>` : ''}
</div>${payMethodsHtml()}<div class="fbase"><span>${esc(f.copyright)}</span><span>${esc(f.note)}${f.showUnsplash ? ' Photos from <a href="https://unsplash.com" rel="noopener">Unsplash</a>.' : ''}</span></div></footer>`;
}

export const faqHtml = (list, heading = 'Frequently asked questions') => list.length
  ? `<section class="faq" id="faq"><div class="wrap"><h2>${esc(heading)}</h2>${list.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>` : '';

export const aboutHtml = (S) => S.about.text
  ? `<section class="about" id="about"><div class="wrap"><h2>${esc(S.about.title)}</h2>${S.about.text.split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')}</div></section>` : '';

export function cardHtml(p, closed) {
  const price = money(p.price);
  const tile = `background:var(--tile${p.tile})`;
  const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="800" height="1000">` : '';
  return `<article class="card"><a class="tilelink" href="${esc(p.url)}" aria-label="${esc(p.name)}"><div class="tile" style="${tile}">${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}${img}</div></a>
<div class="meta"><h3><a href="${esc(p.url)}">${esc(p.name)}</a></h3><span class="price">${p.mrp ? `<span class="was">${money(p.mrp)}</span>` : ''}${price}</span></div><p class="dim">${esc(p.dim)}</p>
${p.soldOut || closed ? `<button class="add" disabled>${p.soldOut ? 'Sold out' : 'Unavailable'}</button>` : `<div class="cardbtns"><button class="add" data-add="${p.id}">Add to cart</button><button class="buy" data-buy="${p.id}">Buy now</button></div>`}</article>`;
}

export function pageShell({ head, S, cats, main, jsonld = [], scripts = '' }) {
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${head}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/page.css">
<link rel="stylesheet" href="/site.css">
${jsonld.filter(Boolean).map(ld).join('\n')}
</head><body><div class="wrap">${headerHtml(S, cats)}</div>${main}<div class="wrap">${footerHtml(S, cats)}</div><script src="/site.js" defer></script>${scripts}</body></html>`;
}

export { slugify, productPath, categoryPath };
