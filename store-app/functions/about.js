import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, esc, headTags, pageShell, breadcrumbLd, organizationLd, faqLd, faqHtml, payMethodsHtml } from '../src/seo.js';

export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S), b = S.business;
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>About us</span></nav>
<div class="legal" style="max-width:860px"><p class="label">Who we are</p><h1>${esc(S.about.title)}</h1>
${S.about.text.split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')}
<h2>What we sell</h2><ul>${cats.map((c) => `<li><a href="${esc(c.path)}"><b>${esc(c.name)}</b></a>: ${esc(c.description)}</li>`).join('')}</ul>
<h2>Why shop with us</h2>${S.promise.map((x) => `<p><b>${esc(x.title)}.</b> ${esc(x.text)}</p>`).join('')}
<h2>Delivery and payment</h2><p>Orders are delivered within 10 to 20 days. Delivery is free above ₹${S.shipping.freeShippingAbove}, otherwise ₹${S.shipping.charge}. You can pay by UPI, card or net banking.</p>${payMethodsHtml()}
<div class="bizbox"><dl><dt>Seller</dt><dd>${esc(b.legalName)}</dd>${b.gstin ? `<dt>GSTIN</dt><dd>${esc(b.gstin)}</dd>` : ''}<dt>Address</dt><dd>${esc(b.street)}, ${esc(b.city)}, ${esc(b.state)} ${esc(b.postcode)}, India</dd><dt>Email</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd><dt>Phone</dt><dd><a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a></dd></dl></div>
<p style="margin-top:24px"><a class="btn" href="/contact">Contact us</a> &nbsp; <a class="btn alt" href="/#shop">Shop now</a></p></div>${faqHtml(S.faq)}</main>`;
  const html = pageShell({
    head: headTags({ title: 'About WinkCasa | Skincare, beauty tools and jewellery from New Delhi', description: `${S.about.text.slice(0, 150).replace(/\s+\S*$/, '')}…`, canonical: SITE + '/about', image: S.seo.ogImage }),
    S, cats, main,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', url: SITE + '/about', name: 'About WinkCasa', about: { '@id': SITE + '/#organization' } },
      organizationLd(S), breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'About us', url: SITE + '/about' }]), faqLd(S.faq)],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
