import { getSettings, activeProducts, categoriesOf, productPath } from '../src/store.js';
import { SITE } from '../src/seo.js';
import { publishedPosts } from '../src/blog.js';

// /links.csv : every page with a ready-to-paste title, description and tags for social bookmarking sites.
const q = (v) => '"' + String(v ?? '').replace(/\s+/g, ' ').replace(/"/g, '""').trim() + '"';
export async function onRequestGet({ env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const out = [['url', 'title', 'description', 'tags']];
  out.push([SITE + '/', 'WinkCasa: everyday jewellery, hair accessories and beauty tools', 'Shop jewellery, hair accessories, beauty tools, dresses and festive decor online in India.', 'jewellery,fashion,india,winkcasa']);
  for (const c of categoriesOf(rows, S)) out.push([SITE + c.path, `${c.name} online in India | WinkCasa`, c.description, `${c.name.toLowerCase()},shopping,india,winkcasa`]);
  for (const r of rows) out.push([SITE + productPath(r), r.name, `${r.name}. ₹${r.price}. Delivery across India.`.slice(0, 200), `${r.category.toLowerCase()},shopping,india`]);
  for (const p of posts) out.push([SITE + '/blog/' + p.slug, p.title, p.excerpt || p.seo_description || '', `${String(p.tags || p.category || 'guide').replace(/\s*,\s*/g, ',')},guide,india`]);
  return new Response(out.map((r) => r.map(q).join(',')).join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'inline; filename="winkcasa-links.csv"', 'Cache-Control': 'public, max-age=600' } });
}
