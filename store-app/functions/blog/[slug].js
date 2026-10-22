import { getSettings, activeProducts, categoriesOf, markdown, wordsOf, headingsOf } from '../../src/store.js';
import { publishedPosts } from '../../src/blog.js';
import { PIN_SLUGS } from '../../src/guides.js';
import { SITE, abs, esc, trim, headTags, pageShell, breadcrumbLd, faqLd, shareHtml, askHtml } from '../../src/seo.js';

function faqFrom(body) {
  const m = String(body || '').split(/^## Frequently asked questions\s*$/m)[1]; if (!m) return [];
  const sec = m.split(/^## /m)[0], out = [];
  sec.split(/^### /m).slice(1).forEach((b) => { const i = b.indexOf('\n'); const q = b.slice(0, i).trim(), a = b.slice(i + 1).trim().replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, ''); if (q && a) out.push({ q, a }); });
  return out;
}
const J = (t) => { try { const v = JSON.parse(t || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const iso = (t) => new Date(t.replace(' ', 'T') + 'Z').toISOString();
const day = (t) => new Date(t.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

const commentsHtml = (post, list) => `<section class="comments" id="comments"><h2>${list.length ? list.length + (list.length === 1 ? ' comment' : ' comments') : 'Comments'}</h2>
${list.map((c) => `<div class="cmt"><b>${esc(c.name)}</b> <span class="muted">${esc(day(c.created_at))}</span><p>${esc(c.body)}</p>${c.reply ? `<div class="cmtr"><b>WinkCasa</b><p>${esc(c.reply)}</p></div>` : ''}</div>`).join('')}
<form id="cform" data-post="${post.id}" novalidate><h3>Leave a comment</h3><input name="name" placeholder="Your name" maxlength="60" required><input name="email" type="email" placeholder="Email (optional, never shown)" maxlength="120"><textarea name="body" rows="4" maxlength="1000" placeholder="Your comment" required></textarea>
<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><button class="btn" type="submit">Post comment</button><p class="fine" id="cmsg">Comments are reviewed before they appear.</p></form></section>`;

export async function onRequestGet({ params, env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return new Response('Post not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  const cats = categoriesOf(rows, S);
  const url = SITE + '/blog/' + post.slug;
  const canonical = post.canonical || url;
  const more = posts.filter((p) => p.id !== post.id && (!post.category || p.category === post.category || true)).sort((a, b) => (b.category === post.category) - (a.category === post.category)).slice(0, 3);

  const bodyFaq = faqFrom(post.body), faq = bodyFaq.length ? [] : J(post.faq_json), faqAll = bodyFaq.length ? bodyFaq : faq;
  const steps = J(post.steps_json), takeaways = J(post.takeaways_json), sources = J(post.sources_json);
  const heads = headingsOf(post.body).filter((h) => h.level === 2 && !/^frequently asked questions$/i.test(h.text));
  const published = post.published_at || post.created_at;
  const edited = post.updated_at && Date.parse(post.updated_at.replace(' ', 'T') + 'Z') - Date.parse(published.replace(' ', 'T') + 'Z') > 2 * 86400000;
  const mins = Math.max(1, Math.round(wordsOf(post.body) / 200));
  const personAuthor = post.author && post.author !== 'WinkCasa Team';
  const on = await env.DB.prepare("SELECT value FROM settings WHERE key='comments_on'").first();
  const comments = on && on.value === '1' ? (await env.DB.prepare("SELECT name, body, reply, created_at FROM comments WHERE post_id=? AND status='approved' ORDER BY id").bind(post.id).all()).results : null;
  const cover = post.image || (PIN_SLUGS.has(post.slug) ? '/pins/' + post.slug + '.png' : '');

  const main = `<main class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/blog">Blog</a> › <span>${esc(trim(post.crumb_title || post.title, 40))}</span></nav>
<article class="article"><p class="label">${post.category ? esc(post.category) + ' · ' : ''}${esc(day(published))}</p><h1>${esc(post.title)}</h1><div class="by">By ${post.author_url ? `<a href="${esc(post.author_url)}" rel="author noopener">${esc(post.author)}</a>` : esc(post.author)} · ${mins} min read${edited ? ` · Updated ${esc(day(post.updated_at))}` : ''}</div>
${post.tldr ? `<div class="tldr" data-speakable><b>Short answer</b><p>${esc(post.tldr)}</p></div>` : ''}
${cover && post.image ? `<img class="hero" src="${esc(post.image)}" alt="${esc(post.img_alt || post.title)}" width="900" height="600">` : ''}
${takeaways.length ? `<div class="takeaways"><b>Key takeaways</b><ul>${takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
${heads.length >= 3 ? `<nav class="toc" aria-label="In this article"><b>In this article</b><ol>${heads.map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('')}</ol></nav>` : ''}
${markdown(post.body)}
${steps.length ? `<section class="howto"><h2>Step by step</h2><ol>${steps.map((s) => `<li><b>${esc(s.name)}</b><p>${esc(s.text)}</p></li>`).join('')}</ol></section>` : ''}
${faq.length ? `<section class="faq postfaq"><h2>Frequently asked questions</h2>${faq.map((f) => `<details><summary><span>${esc(f.q)}</span></summary><p>${esc(f.a)}</p></details>`).join('')}</section>` : ''}
${sources.length ? `<section class="sources"><h2>Sources</h2><ol>${sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.title)}</a></li>`).join('')}</ol></section>` : ''}
${PIN_SLUGS.has(post.slug) ? `<figure class="pinfig"><img src="/pins/${esc(post.slug)}.png" alt="${esc(post.title)}: WinkCasa style guide" width="400" height="600" loading="lazy"><figcaption>Save this guide for later.</figcaption></figure>` : ''}
${post.author_bio ? `<aside class="authorbox"><b>About ${esc(post.author)}</b><p>${esc(post.author_bio)}</p></aside>` : ''}
<div class="postfoot"><div class="pfl"><a class="btn" href="/try">Find your face shape</a><a class="btn alt" href="/#shop">Shop WinkCasa</a>${askHtml(S, post.title, true)}</div>
${shareHtml({ url: canonical, title: post.title, image: cover, text: 'Worth a read: ' + post.title })}</div>
${comments ? commentsHtml(post, comments) : ''}</article>
${more.length ? `<section class="sec"><h2>More to read</h2><div class="posts" style="padding-block:10px 0">${more.map((p) => `<article class="post"><a href="/blog/${esc(p.slug)}"><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p></a></article>`).join('')}</div></section>` : ''}</main>`;

  const robots = post.noindex || post.nofollow || post.noarchive
    ? [post.noindex ? 'noindex' : 'index', post.nofollow ? 'nofollow' : 'follow', post.noarchive ? 'noarchive' : ''].filter(Boolean).join(',')
    : undefined;
  const ld = [breadcrumbLd([{ name: 'Home', url: SITE + '/' }, { name: 'Blog', url: SITE + '/blog' }, { name: post.title, url }]),
    {
      '@context': 'https://schema.org', '@type': post.schema_type || 'BlogPosting', headline: post.title, description: post.seo_description || post.excerpt, mainEntityOfPage: canonical, url: canonical,
      image: cover ? [abs(cover)] : undefined, datePublished: iso(published), dateModified: iso(post.updated_at || published),
      keywords: [post.focus_kw, post.extra_kw, post.tags].filter(Boolean).join(', ') || undefined, articleSection: post.category || undefined, wordCount: wordsOf(post.body),
      author: personAuthor ? { '@type': 'Person', name: post.author, url: post.author_url || undefined, description: post.author_bio || undefined } : { '@type': 'Organization', name: post.author || 'WinkCasa Team', url: SITE + '/' },
      publisher: { '@id': SITE + '/#organization' }, inLanguage: 'en-IN',
      citation: sources.length ? sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })) : undefined,
      speakable: post.tldr ? { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.tldr'] } : undefined,
    }];
  if (faqAll.length) ld.unshift(faqLd(faqAll));
  if (steps.length) ld.push({ '@context': 'https://schema.org', '@type': 'HowTo', name: post.title, description: post.excerpt, step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })) });

  const html = pageShell({
    head: headTags({
      title: trim(post.seo_title || post.title + ' | WinkCasa', 70), description: trim(post.seo_description || post.excerpt, 160), canonical, type: 'article',
      image: cover || S.seo.ogImage, ogImage: post.og_image || undefined, ogTitle: post.og_title || undefined, ogDescription: post.og_desc || undefined,
      twCard: post.tw_card || undefined, twTitle: post.tw_title || undefined, twDescription: post.tw_desc || undefined, robots,
    }),
    S, cats, main, jsonld: ld,
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
