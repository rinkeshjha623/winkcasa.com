import { getSettings, activeProducts, categoriesOf } from './store.js';
import { SITE, esc, headTags, pageShell, breadcrumbLd } from './seo.js';

// Policy pages: the text lives in /legal/<name>.html; we wrap it in the same header, footer and SEO as the rest of the site.
export const legalHandler = (name, path) => async ({ request, env }) => {
  const res = await env.ASSETS.fetch(new URL('/legal/' + name, request.url));
  if (!res.ok) return new Response('Not found', { status: 404 });
  const src = await res.text();
  const title = (src.match(/<title>(.*?)<\/title>/s) || [])[1] || name;
  const desc = ((src.match(/<meta name="description" content="(.*?)">/s) || [])[1]) || '';
  let body = (src.match(/<main>([\s\S]*?)<\/main>/) || [])[1] || '';
  body = body.replace(/<div class="biz"[\s\S]*?<\/div>/, '').replace(/<p class="upd">/, '<p class="upd">');
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S), b = S.business;
  const biz = `<div class="bizbox"><dl><dt>Seller</dt><dd>${esc(b.legalName)}</dd>${b.gstin ? `<dt>GSTIN</dt><dd>${esc(b.gstin)}</dd>` : ''}<dt>Address</dt><dd>${esc(b.street)}, ${esc(b.city)}, ${esc(b.state)} ${esc(b.postcode)}, India</dd><dt>Email</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd><dt>Phone</dt><dd>${esc(b.phone)}</dd>${b.grievanceOfficer ? `<dt>Grievance officer</dt><dd>${esc(b.grievanceOfficer)}</dd>` : ''}</dl></div>`;
  const label = title.split('|')[0].trim();
  const html = pageShell({
    head: headTags({ title, description: desc, canonical: SITE + path, image: S.seo.ogImage }),
    S, cats, main: `<main class="wrap"><div class="legal">${body}${biz}</div></main>`,
    jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: label, url: SITE + path }])],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};
