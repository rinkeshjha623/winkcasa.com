import { getSettings, activeProducts, categoriesOf, markdown, wordsOf } from '../../src/store.js';
import { publishedPosts } from '../../src/blog.js';
import { PIN_SLUGS } from '../../src/guides.js';
import { SITE, abs, esc, trim, headTags, pageShell, breadcrumbLd, faqLd } from '../../src/seo.js';

function faqFrom(body) {
  const m = String(body || '').split(/^## Frequently asked questions\s*$/m)[1]; if (!m) return [];
  const sec = m.split(/^## /m)[0], out = [];
  sec.split(/^### /m).slice(1).forEach((b) => { const i = b.indexOf('\n'); const q = b.slice(0, i).trim(), a = b.slice(i + 1).trim().replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, ''); if (q && a) out.push({ q, a }); });
  return out;
}
const iso = (t) => new Date(t.replace(' ', 'T') + 'Z').toISOString();
const day = (t) => new Date(t.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export async function onRequestGet({ params, env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return new Response('Post not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const cats = categoriesOf(rows, S);
  const url = SITE + '/blog/' + post.slug;
  const more = posts.filter((p) => p.id !== post.id).slice(0, 3);
  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/blog">Blog</a> › <span>${esc(trim(post.title, 40))}</span></nav>
<article class="article"><p class="label">${esc(day(post.published_at || post.created_at))}</p><h1>${esc(post.title)}</h1><div class="by">By ${esc(post.author)} · ${Math.max(1, Math.round(wordsOf(post.body) / 200))} min read</div>
${post.image ? `<img class="hero" src="${esc(post.image)}" alt="${esc(post.title)}" width="900" height="600">` : ''}${markdown(post.body)}
<p style="margin-top:30px"><a class="btn" href="/#shop">Shop WinkCasa</a></p></article>
${more.length ? `<section class="sec"><h2>More to read</h2><div class="posts" style="padding-block:10px 0">${more.map((p) => `<article class="post"><a href="/blog/${esc(p.slug)}"><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p></a></article>`).join('')}</div></section>` : ''}</main>`;
  const html = pageShell({
    head: headTags({ title: trim(post.seo_title || post.title + ' | WinkCasa', 70), description: trim(post.seo_description || post.excerpt, 160), canonical: url, image: post.image || (PIN_SLUGS.has(post.slug) ? '/pins/' + post.slug + '.png' : S.seo.ogImage), type: 'article' }),
    S, cats, main,
    jsonld: [faqLd(faqFrom(post.body)), breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: SITE + '/blog' }, { name: post.title, url }]),
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.excerpt, mainEntityOfPage: url, url,
        image: post.image ? [abs(post.image)] : undefined, datePublished: iso(post.published_at || post.created_at), dateModified: iso(post.updated_at),
        author: { '@type': 'Organization', name: post.author || 'WinkCasa Team' }, publisher: { '@id': SITE + '/#organization' }, inLanguage: 'en-IN' }],
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
