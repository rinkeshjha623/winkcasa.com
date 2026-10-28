import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, esc, trim, headTags, pageShell, breadcrumbLd } from '../src/seo.js';

// /press : media kit for bloggers, journalists and gift-guide editors.
export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S), b = S.business, url = SITE + '/press';
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Press and media kit</span></nav>
<div class="cathead"><p class="label">Press</p><h1>WinkCasa press and media kit</h1><p>Everything an editor, blogger or creator needs to write about WinkCasa: who we are, what we sell, and how to reach us.</p></div>
<section class="sec"><h2>About WinkCasa</h2><p>WinkCasa is an online store based in ${esc(b.city)}, India, selling everyday jewellery, hair accessories, beauty tools, dresses and festive decor. We deliver across India in 10 to 20 days, accept UPI, cards and net banking, and offer 7-day replacement or refund for damaged, defective or wrong items.</p>
<p>Operated by ${esc(b.legalName)}. GSTIN ${esc(b.gstin)}.</p></section>
<section class="sec"><h2>Quick facts</h2><ul><li><b>Founder:</b> ${esc(S.seo.founder || 'Rinkesh Kumar Jha')}</li><li><b>Based in:</b> ${esc(b.city)}, ${esc(b.state)}, India</li><li><b>Website:</b> ${SITE}</li><li><b>Categories:</b> ${cats.map((c) => esc(c.name)).join(', ')}</li><li><b>Products live:</b> ${rows.length}</li><li><b>Price range:</b> from about ₹${Math.min(...rows.map((r) => r.price))} to ₹${Math.max(...rows.map((r) => r.price))}</li></ul></section>
<section class="sec"><h2>Collections</h2><ul>${cats.map((c) => `<li><a href="${esc(c.path)}">${esc(c.name)}</a>: ${esc(c.description)}</li>`).join('')}</ul></section>
<section class="sec"><h2>Guides you can link to</h2><ul><li><a href="/blog">WinkCasa blog: jewellery, hair and beauty guides</a></li><li><a href="/links">All collections, products and guides</a></li><li><a href="/try">Find your look: face-shape styling tool</a></li></ul></section>
<section class="sec"><h2>Press contact</h2><p>${esc(b.email)} · ${esc(b.phone)}. We reply within one working day and can share product images and review pieces for gift guides.</p><p><a class="btn" href="/contact">Contact us</a></p></section></main>`;
  const html = pageShell({ head: headTags({ title: 'WinkCasa press and media kit', description: trim('About WinkCasa, quick facts, collections and press contact for editors, bloggers and creators.', 160), canonical: url, image: S.seo.ogImage }),
    S, cats, main, jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Press', url }])] });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
