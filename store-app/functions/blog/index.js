import { getSettings, activeProducts, categoriesOf } from '../../src/store.js';
import { publishedPosts } from '../../src/blog.js';
import { SITE, esc, headTags, pageShell, breadcrumbLd, ld } from '../../src/seo.js';

const day = (t) => new Date(t.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export async function onRequestGet({ env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const cats = categoriesOf(rows, S);
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Blog</span></nav>
<div class="cathead"><p class="label">The WinkCasa journal</p><h1>Skincare and jewellery guides</h1><p>Simple, practical advice on skincare, beauty tools and jewellery care.</p></div>
<div class="posts">${posts.map((p) => `<article class="post"><a href="/blog/${esc(p.slug)}">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" width="600" height="400">` : ''}<div class="by">${esc(day(p.published_at || p.created_at))}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p></a></article>`).join('') || '<p class="dim">No posts yet. Check back soon.</p>'}</div></main>`;
  const html = pageShell({
    head: headTags({ title: 'Blog | Skincare and jewellery guides | WinkCasa', description: 'Practical guides on skincare routines, beauty tools and jewellery care from WinkCasa.', canonical: SITE + '/blog', image: S.seo.ogImage }),
    S, cats, main,
    jsonld: [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: SITE + '/blog' }]),
      { '@context': 'https://schema.org', '@type': 'Blog', name: 'WinkCasa Journal', url: SITE + '/blog', blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: SITE + '/blog/' + p.slug })) }],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
