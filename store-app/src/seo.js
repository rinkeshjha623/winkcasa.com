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
<a href="/try">Find your look</a><a href="/blog">Blog</a><a href="/about">About us</a><a href="/contact">Contact us</a></nav>
<details class="mmenu"><summary>Menu</summary><div class="mlist"><a href="/">Home</a>${shop}<a href="/#shop">All products</a><a href="/try">Find your look</a><a href="/blog">Blog</a><a href="/about">About us</a><a href="/contact">Contact us</a><a href="/track">Track your order</a><a class="macct" href="/account">My account</a></div></details></div>
${logoHtml(S)}<div class="rt"><a class="acctlink" href="/account" data-acct>Account</a><a class="cartbtn" href="/cart" aria-label="View cart">Cart <b data-cartcount>0</b></a></div></header>`;
}

export const payMethodsHtml = () => `<div class="paym" aria-label="Payment options"><span class="pm">UPI</span><span class="pm">Credit &amp; debit cards</span><span class="pm">Net banking</span><span class="pms">Secure payment by Razorpay</span></div>`;
export const etaHtml = () => `<p class="eta" data-eta>Delivered within <b>10–20 days</b> of your order.</p>`;

const LASH = '<svg class="lashico" viewBox="0 0 48 28" width="34" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 9q19 17 38 0"/><path d="M9 13 4 19M16 17l-3 7M24 19v8M32 17l3 7M39 13l5 6"/></svg>';
// Header/footer logo, in the style chosen in Admin → Store settings (or an uploaded image).
export function logoHtml(S, cls = '') {
  const L = S.logo || {};
  const c = (x) => `class="logo ${x}${cls ? ' ' + cls : ''}"`;
  if (L.image) return `<a ${c('logo-img')} href="/" aria-label="WinkCasa"><img src="${esc(L.image)}" alt="WinkCasa" height="44"></a>`;
  if (L.style === 'lash') return `<a ${c('logo-lash')} href="/" aria-label="WinkCasa">${LASH}<span>WINKCASA</span></a>`;
  if (L.style === 'stacked') return `<a ${c('logo-stack')} href="/" aria-label="WinkCasa"><i>Wink</i><i>Casa</i></a>`;
  return `<a ${c('')} href="/" aria-label="WinkCasa">W<span class="idot">ı</span>nkCasa</a>`;
}

export function footerHtml(S, cats) {
  const b = S.business, f = S.footer;
  const social = [['Instagram', S.social.instagram], ['Facebook', S.social.facebook], ['YouTube', S.social.youtube], ['WhatsApp', S.social.whatsapp]].filter(([, u]) => u);
  const L = (h, t) => `<li><a href="${esc(h)}">${esc(t)}</a></li>`;
  const care = [['/track', 'Track your order'], ['/returns', 'Returns & refunds'], ['/shipping', 'Shipping & delivery'], ['/#faq', 'FAQs'], ['/contact', 'Contact us']];
  const company = [['/about', 'About WinkCasa'], ['/blog', 'The Journal'], ['/try', 'Find your look'], ['/account', 'My account']];
  const legal = (f.links || []).filter((l) => /privacy|terms|policy|condition/i.test(l.label + l.href)).map((l) => [l.href, l.label]);
  return `<footer id="footerEl" class="sitefoot"><div class="fcols">
<div class="fbrand"><div class="flogo">${S.logo && S.logo.image ? `<img src="${esc(S.logo.image)}" alt="WinkCasa" height="48">` : S.logo && S.logo.style === 'lash' ? `${LASH}<span class="flw">WINKCASA</span>` : S.logo && S.logo.style === 'stacked' ? '<i>Wink</i> <i>Casa</i>' : 'WinkCasa'}</div><p class="ftag">Considered pieces for a beautifully lived-in home.</p><address>${esc(b.legalName)}<br>${esc(b.street)}, ${esc(b.city)}, ${esc(b.state)} ${esc(b.postcode)}, India<br><a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a><br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.gstin ? `<br><span class="fgst">GSTIN ${esc(b.gstin)}</span>` : ''}</address></div>
<div><h4>Shop</h4><ul>${L('/#shop', 'All products')}${cats.map((c) => L(c.path, c.name)).join('')}</ul></div>
<div><h4>Customer care</h4><ul>${care.map(([h, t]) => L(h, t)).join('')}</ul></div>
<div><h4>Company</h4><ul>${company.map(([h, t]) => L(h, t)).join('')}</ul></div>
<div><h4>Legal</h4><ul>${legal.map(([h, t]) => L(okHref(h), t)).join('')}</ul>${social.length ? `<h4 class="h4b">Follow us</h4><ul>${social.map(([n, u]) => `<li><a href="${esc(u)}" rel="noopener me">${n}</a></li>`).join('')}</ul>` : ''}</div>
</div>${payMethodsHtml()}<div class="fbase"><span>${esc(f.copyright)}</span><span>${esc(f.note)}${f.showUnsplash ? ' Photos from <a href="https://unsplash.com" rel="noopener">Unsplash</a>.' : ''}</span></div></footer>`;
}
</div>${payMethodsHtml()}<div class="fbase"><span>${esc(f.copyright)}</span><span>${esc(f.note)}${f.showUnsplash ? ' Photos from <a href="https://unsplash.com" rel="noopener">Unsplash</a>.' : ''}</span></div></footer>`;
}

export const faqHtml = (list, heading = 'Frequently asked questions') => list.length
  ? `<section class="faq" id="faq"><div class="wrap faqgrid"><div class="faqhead"><p class="faqeye">Concierge</p><h2>${esc(heading)}</h2><p class="faqsub">Everything you may wish to know before you order. Can't find it? We reply within one working day.</p><a class="btn alt" href="/contact">Speak to us</a></div><div class="faqlist">${list.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span></summary><p>${esc(f.a)}</p></details>`).join('')}</div></div></section>` : '';

export const aboutHtml = (S) => S.about.text
  ? `<section class="about" id="about"><div class="wrap"><h2>${esc(S.about.title)}</h2>${S.about.text.split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')}</div></section>` : '';

export function cardHtml(p, closed) {
  const price = money(p.price);
  const tile = `background:var(--tile${p.tile})`;
  const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="800" height="1000">` : '';
  const dim = p.dim && p.dim.length <= 100 && !/:/.test(p.dim) ? p.dim : '';
  return `<article class="card"><button class="wish" data-wish="${p.id}" aria-label="Save to wishlist" title="Save to wishlist">♡</button><a class="tilelink" href="${esc(p.url)}" aria-label="${esc(p.name)}"><div class="tile" style="${tile}">${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}${img}</div></a>
<div class="meta"><h3><a href="${esc(p.url)}">${esc(p.name)}</a></h3><span class="price">${p.mrp ? `<span class="was">${money(p.mrp)}</span>` : ''}${price}</span></div>${dim ? `<p class="dim">${esc(dim)}</p>` : ''}
${p.soldOut || closed ? `<button class="add" disabled>${p.soldOut ? 'Sold out' : 'Unavailable'}</button>` : `<div class="cardbtns"><button class="add" data-add="${p.id}">Add to cart</button><button class="buy" data-buy="${p.id}">Buy now</button></div>`}</article>`;
}

export function pageShell({ head, S, cats, main, jsonld = [], scripts = '' }) {
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${head}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-C8DKK7TQWM"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-C8DKK7TQWM");</script>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="WinkCasa">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/page.css">
<link rel="stylesheet" href="/site.css">
${jsonld.filter(Boolean).map(ld).join('\n')}
</head><body><div class="wrap">${headerHtml(S, cats)}</div>${main}<div class="wrap">${footerHtml(S, cats)}</div><script src="/site.js" defer></script>${scripts}</body></html>`;
}

export { slugify, productPath, categoryPath };
