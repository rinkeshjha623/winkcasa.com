import { getSettings, activeProducts, categoriesOf, productPath } from '../src/store.js';
import { SITE, esc, trim, headTags, pageShell, breadcrumbLd } from '../src/seo.js';
import { publishedPosts } from '../src/blog.js';

// /links : one public directory of every WinkCasa page with one-tap share and bookmark links for the major social platforms.
const shareLinks = (url, title) => {
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  return [['Pinterest', `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`], ['Tumblr', `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${u}&title=${t}`],
    ['Flipboard', `https://share.flipboard.com/bookmarklet/popout?v=2&url=${u}&title=${t}`], ['Reddit', `https://www.reddit.com/submit?url=${u}&title=${t}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`], ['X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`], ['WhatsApp', `https://wa.me/?text=${t}%20${u}`], ['Mix', `https://mix.com/add?url=${u}`]];
};
export async function onRequestGet({ env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const cats = categoriesOf(rows, S);
  const item = (path, title, note) => `<li><a href="${esc(path)}"><strong>${esc(title)}</strong></a>${note ? ` <span class="dim">${esc(note)}</span>` : ''}
<details style="display:inline"><summary class="dim" style="display:inline;cursor:pointer">Share</summary> ${shareLinks(SITE + path, title).map(([n, h]) => `<a href="${esc(h)}" rel="noopener nofollow" target="_blank">${n}</a>`).join(' · ')}</details></li>`;
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>All pages</span></nav>
<div class="cathead"><p class="label">Directory</p><h1>WinkCasa: all collections, products and guides</h1><p>Every page on winkcasa.com in one place, with one-tap share links for Pinterest, Tumblr, Flipboard, Reddit, Facebook, X, LinkedIn, WhatsApp and Mix. Bookmark the ones you like.</p></div>
<section><h2>Collections</h2><ul>${cats.map((c) => item(c.path, c.name, c.description)).join('')}</ul></section>
<section><h2>Products</h2><ul>${rows.map((r) => item(productPath(r), r.name, `₹${r.price} · ${r.category}`)).join('')}</ul></section>
<section><h2>Guides and articles</h2><ul>${posts.map((p) => item('/blog/' + p.slug, p.title, '')).join('')}</ul></section>
<section><h2>Company and help</h2><ul>${[['/about', 'About WinkCasa'], ['/contact', 'Contact'], ['/shipping', 'Shipping'], ['/returns', 'Returns'], ['/blog', 'Blog']].map(([p, t]) => item(p, t, '')).join('')}</ul></section></main>`;
  const url = SITE + '/links';
  const html = pageShell({ head: headTags({ title: 'All WinkCasa pages: collections, products and guides', description: trim('Browse and share every WinkCasa collection, product and guide: jewellery, hair accessories, beauty tools, dresses and festive decor.', 160), canonical: url, image: S.seo.ogImage }),
    S, cats, main, jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'All pages', url }])] });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
