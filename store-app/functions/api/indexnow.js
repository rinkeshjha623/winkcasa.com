import { getSettings, activeProducts, categoriesOf, productPath } from '../../src/store.js';
import { SITE } from '../../src/seo.js';
import { publishedPosts } from '../../src/blog.js';

// Tells Bing, Yandex and other IndexNow search engines about every public URL. Safe to call any time.
const KEY = '310772f01b7e395fc84a92f085aa82a5';
export async function onRequestGet({ env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const urlList = [SITE + '/', SITE + '/links', SITE + '/blog', SITE + '/about', SITE + '/contact',
    ...categoriesOf(rows, S).map((c) => SITE + c.path), ...rows.filter((r) => !r.noindex).map((r) => SITE + productPath(r)), ...posts.filter((p) => !p.noindex).map((p) => SITE + '/blog/' + p.slug)];
  const res = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'www.winkcasa.com', key: KEY, keyLocation: SITE + '/' + KEY + '.txt', urlList }) });
  return new Response(JSON.stringify({ ok: res.ok, status: res.status, submitted: urlList.length }), { headers: { 'Content-Type': 'application/json' } });
}
