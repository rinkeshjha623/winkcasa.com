import { getSettings, activeProducts, publicProduct, categoriesOf, searchProducts } from '../src/store.js';
import { SITE, esc, headTags, pageShell, cardHtml } from '../src/seo.js';

// /search?q=... : product search results page (not indexed).
export async function onRequestGet({ env, request }) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 80);
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const hits = q ? searchProducts(rows, q).map(publicProduct) : [];
  const sugg = cats.map((c) => `<a href="${esc(c.path)}">${esc(c.name)}</a>`).join('');
  const main = `<main class="wrap"><div class="cathead"><p class="label">Search</p><h1>${q ? `Results for "${esc(q)}"` : 'Search WinkCasa'}</h1>
<form class="srchpage" action="/search" method="get" role="search"><input type="search" name="q" value="${esc(q)}" placeholder="Search earrings, serums, hair clips..." aria-label="Search products" autocomplete="off"><button type="submit">Search</button></form>
${q ? `<p>${hits.length} product${hits.length === 1 ? '' : 's'} found.</p>` : ''}</div>
${hits.length ? `<div class="grid">${hits.map((p) => cardHtml(p, !S.store.open)).join('')}</div>` : q ? `<div class="nores"><p>We could not find anything for "${esc(q)}". Try a simpler word such as earrings, necklace or serum, or browse a collection:</p><div class="nrcats">${sugg}</div></div>` : `<div class="nores"><p>Browse a collection:</p><div class="nrcats">${sugg}</div></div>`}</main>`;
  const html = pageShell({ head: headTags({ title: (q ? `Search: ${q}` : 'Search') + ' | WinkCasa', description: 'Search WinkCasa for jewellery, hair accessories and beauty tools.', canonical: SITE + '/search', noindex: true }), S, cats, main });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
