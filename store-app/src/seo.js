import { productPath, categoryPath, slugify } from './store.js';

export const SITE = 'https://www.winkcasa.com';

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rich = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
export const abs = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u));
export const trim = (t, n) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const okHref = (h) => (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(h || '') ? h : '#');
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

export const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export function headTags({ title, description, canonical, image, type = 'website', noindex = false, robots, ogTitle, ogDescription, ogImage, twCard, twTitle, twDescription }) {
  const img = abs(ogImage || image), ot = ogTitle || title, od = ogDescription || description;
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${esc(robots || (noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'))}">
<meta name="theme-color" content="#0B1916">
<meta name="color-scheme" content="dark light">
<script>try{var t=localStorage.getItem('wc_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<meta property="og:site_name" content="WinkCasa">
<meta property="og:locale" content="en_IN">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(ot)}">
<meta property="og:description" content="${esc(od)}">
<meta property="og:url" content="${esc(canonical)}">
${img ? `<meta property="og:image" content="${esc(img)}">` : ''}
<meta name="twitter:card" content="${esc(twCard || (img ? 'summary_large_image' : 'summary'))}">
<meta name="twitter:title" content="${esc(twTitle || ot)}">
<meta name="twitter:description" content="${esc(twDescription || od)}">
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
    image: abs(S.seo.ogImage) || SITE + '/icon.svg',
    slogan: 'Refined pieces, made for every day.',
    founder: S.seo.founder ? { '@type': 'Person', name: S.seo.founder } : undefined,
    foundingLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: b.city, addressCountry: 'IN' } },
    knowsAbout: ['Jewellery', 'Earrings', 'Necklaces', 'Hair accessories', 'Beauty tools', 'Ethnic wear', 'Potli bags', 'Diwali decor'],
  };
}

// The home page itself, tied to the organisation and website, with a product list that carries images and prices.
export const homePageLd = (S, prods) => ({ '@context': 'https://schema.org', '@type': ['WebPage', 'CollectionPage'], '@id': SITE + '/#webpage', url: SITE + '/', name: S.seo.title, description: S.seo.description,
  inLanguage: 'en-IN', isPartOf: { '@id': SITE + '/#website' }, about: { '@id': SITE + '/#organization' }, publisher: { '@id': SITE + '/#organization' },
  primaryImageOfPage: abs(S.seo.ogImage || prods.find((p) => p.image)?.image) || undefined,
  mainEntity: { '@type': 'ItemList', numberOfItems: prods.length, itemListElement: prods.slice(0, 24).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(p.url),
    item: { '@type': 'Product', name: p.name, url: abs(p.url), image: p.image ? abs(p.image) : undefined, brand: { '@type': 'Brand', name: 'WinkCasa' },
      offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(p.price), availability: 'https://schema.org/InStock', url: abs(p.url) } } })) } });
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
    name: p.name, description: p.ai_answer || p.seo_description || p.description || p.name, material: p.material || undefined, keywords: p.focus_keyword || undefined, sku: p.sku || String(p.id),
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
${logoHtml(S)}<div class="rt"><button class="themebtn" type="button" data-theme-toggle aria-label="Switch colour theme" title="Switch between dark and light"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg></button><a class="acctlink" href="/account" data-acct>Account</a><a class="cartbtn" href="/cart" aria-label="View cart">Cart <b data-cartcount>0</b></a></div></header>`;
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

export const faqHtml = (list, heading = 'Frequently asked questions') => list.length
  ? `<section class="faq" id="faq"><div class="wrap faqgrid"><div class="faqhead"><p class="faqeye">Concierge</p><h2>${esc(heading)}</h2><p class="faqsub">Everything you may wish to know before you order. Can't find it? We reply within one working day.</p><a class="btn alt" href="/contact">Speak to us</a></div><div class="faqlist">${list.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span></summary><p>${esc(f.a)}</p></details>`).join('')}</div></div></section>` : '';

export const aboutHtml = (S) => S.about.text
  ? `<section class="about" id="about"><div class="wrap aboutgrid"><div class="abouttxt"><p class="faqeye">Our story</p><h2>${esc(S.about.title)}</h2>${S.about.text.split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')}</div><div class="pillars"><div><span>01</span><h3>Curated, not crowded</h3><p>A small edit of earrings, necklaces, hair pieces and beauty tools, each one chosen with care.</p></div><div><span>02</span><h3>Styled to your face</h3><p>Find your look reads your face shape and shows each piece on you before you buy.</p></div><div><span>03</span><h3>Made right, always</h3><p>Damaged, defective or not as described? Tell us within 7 days and we will replace it or refund you.</p></div></div></div></section>` : '';

export const tryTeaserHtml = () => `<section class="tryteaser" id="findlook"><div class="wrap tt"><div class="ttcopy"><p class="faqeye">Find your look</p><h2>Let your face choose your jewellery.</h2><p>Take a selfie and see your face shape, then watch earrings, necklaces and hair pieces appear on you, chosen to flatter your features. It runs privately on your own device.</p><ul class="ttsteps"><li><b>1</b> Take or upload a selfie</li><li><b>2</b> Discover your face shape</li><li><b>3</b> See each piece on you, then shop it</li></ul><a class="cta" href="/try">Try it on yourself</a></div><a class="ttvis" href="/try" aria-label="Find your look"><img src="/pins/find-your-look.png" alt="Find your look: see jewellery placed on your own selfie" width="400" height="600" loading="lazy"></a></div></section>`;

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

const enc = encodeURIComponent;
const IC = {
  wa: '<path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.300 1.700 2.100 1.200 1 2.200 1.400 2.500 1.500.3.1.5.1.7-.1l1-1.200c.2-.3.4-.2.7-.1l1.900.9c.3.1.5.2.6.3.1.2.1.8-.2 1.500Z"/>',
  pin: '<path d="M12 2a10 10 0 0 0-3.6 19.300c-.1-.8-.2-2 0-2.900l1.200-5s-.3-.6-.3-1.500c0-1.400.8-2.500 1.800-2.500.9 0 1.300.6 1.300 1.400 0 .9-.5 2.100-.8 3.300-.2 1 .5 1.800 1.500 1.800 1.800 0 3.200-1.900 3.200-4.600 0-2.400-1.700-4.100-4.200-4.100-2.900 0-4.600 2.200-4.600 4.400 0 .9.300 1.800.8 2.300.1.1.1.2.1.3l-.3 1.100c0 .2-.2.200-.4.100-1.300-.6-2.100-2.500-2.100-4 0-3.300 2.400-6.300 6.900-6.300 3.600 0 6.400 2.600 6.400 6 0 3.600-2.200 6.500-5.400 6.500-1.100 0-2.100-.6-2.400-1.200l-.7 2.500c-.2.900-.9 2.100-1.300 2.800A10 10 0 1 0 12 2Z"/>',
  fb: '<path d="M22 12a10 10 0 1 0-11.600 9.900v-7H7.900V12h2.500V9.800c0-2.500 1.500-3.900 3.800-3.900 1.100 0 2.200.2 2.200.2v2.500h-1.300c-1.200 0-1.600.8-1.600 1.600V12h2.800l-.4 2.900h-2.300v7A10 10 0 0 0 22 12Z"/>',
  x: '<path d="M17.800 3h3.100l-6.800 7.700L22 21h-6.200l-4.900-6.300L5.300 21H2.200l7.200-8.300L1.900 3h6.400l4.400 5.800L17.800 3Zm-1.100 16.200h1.700L7.200 4.700H5.400l11.300 14.500Z"/>',
  link: '<path d="M10.600 13.400a1 1 0 0 1 0-1.400l3-3a3.500 3.500 0 1 1 5 5l-1.500 1.500a1 1 0 0 1-1.400-1.400l1.500-1.500a1.500 1.500 0 1 0-2.100-2.100l-3 3a1 1 0 0 1-1.500-.1ZM13.400 10.600a1 1 0 0 1 0 1.400l-3 3a3.500 3.500 0 1 1-5-5l1.500-1.500a1 1 0 0 1 1.400 1.400L6.800 11.400a1.500 1.500 0 1 0 2.100 2.100l3-3a1 1 0 0 1 1.500.1Z"/>',
  more: '<path d="M18 16a3 3 0 0 0-2.200 1l-6.700-3.500a3 3 0 0 0 0-3L15.800 7a3 3 0 1 0-.8-2 3 3 0 0 0 .1.600L8.600 9A3 3 0 1 0 8.600 15l6.500 3.400A3 3 0 1 0 18 16Z"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">${IC[k]}</svg>`;
export function shareHtml({ url, title, image, text }) {
  const t = text || title;
  return `<div class="share" data-share data-url="${esc(url)}" data-title="${esc(title)}"><span class="sharelbl">Share</span>
<a class="sh sh-wa" href="https://wa.me/?text=${enc(t + ' ' + url)}" target="_blank" rel="noopener" aria-label="Share on WhatsApp" title="WhatsApp">${ico('wa')}</a>
<a class="sh" href="https://www.pinterest.com/pin/create/button/?url=${enc(url)}${image ? '&media=' + enc(abs(image)) : ''}&description=${enc(t)}" target="_blank" rel="noopener" aria-label="Save to Pinterest" title="Pinterest">${ico('pin')}</a>
<a class="sh" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener" aria-label="Share on Facebook" title="Facebook">${ico('fb')}</a>
<a class="sh" href="https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(t)}" target="_blank" rel="noopener" aria-label="Share on X" title="X">${ico('x')}</a>
<button class="sh" type="button" data-copy="${esc(url)}" aria-label="Copy link" title="Copy link">${ico('link')}</button><button class="sh" type="button" data-nshare hidden aria-label="More sharing options" title="More">${ico('more')}</button></div>`;
}
export function askHtml(S, subject, bare) {
  const num = String((S.social && S.social.whatsapp && S.social.whatsapp.replace(/\D/g, '')) || S.business.phone.replace(/\D/g, '')).replace(/^0+/, '');
  const full = num.length === 10 ? '91' + num : num;
  const a = `<a class="btn alt" href="https://wa.me/${full}?text=${enc('Hi WinkCasa, I have a question about: ' + subject)}" target="_blank" rel="noopener">Ask us on WhatsApp</a>`;
  return bare ? a : `<p class="askwa">${a}</p>`;
}
