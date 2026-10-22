import { getSettings, activeProducts, categoriesOf, productPath } from '../src/store.js';
import { SITE, esc } from '../src/seo.js';
import { publishedPosts } from '../src/blog.js';

export async function onRequestGet({ env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const day = (t) => (t || '').slice(0, 10);
  const u = (loc, mod, pri, freq) => `<url><loc>${esc(SITE + loc)}</loc>${mod ? `<lastmod>${day(mod)}</lastmod>` : ''}<changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  const latest = rows.map((r) => r.updated_at).sort().pop();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + [
    u('/', latest, '1.0', 'daily'),
    ...categoriesOf(rows, S).map((c) => u(c.path, latest, '0.8', 'daily')),
    ...rows.map((r) => u(productPath(r), r.updated_at, '0.9', 'weekly')),
    u('/blog', posts[0]?.updated_at, '0.7', 'weekly'),
    ...posts.map((p) => u('/blog/' + p.slug, p.updated_at, '0.6', 'monthly')),
    u('/about', '', '0.5', 'yearly'), u('/contact', '', '0.5', 'yearly'),
    ...['/returns', '/shipping', '/privacy', '/terms'].map((p) => u(p, '', '0.3', 'yearly')),
  ].join('\n') + '\n</urlset>';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
