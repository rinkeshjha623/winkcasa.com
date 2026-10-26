// 30 daily articles (Oct 27 to Nov 25 2026), seeded once and published automatically:
// the blog only shows posts whose published_at has passed, so each goes live at 10:00 IST on its day.
import { BATCH1 } from './articles1.js';
import { BATCH2 } from './articles2.js';
import { BATCH3 } from './articles3.js';
import { EXTRA } from './articles-extra.js';

export const ARTICLES = [...BATCH1, ...BATCH2, ...BATCH3].map((a) => ({ ...a, body: EXTRA[a.slug] ? a.body.replace('## Frequently asked questions', EXTRA[a.slug] + '\n\n## Frequently asked questions') : a.body }));
const FIRST_DAY = Date.UTC(2026, 9, 27, 4, 30, 0); // 10:00 IST
const BIO = 'WinkCasa is a New Delhi based retailer of everyday jewellery, hair accessories and beauty tools. Guides are written by the WinkCasa team and reviewed before publishing.';
const sql = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

export async function ensureArticles(env) {
  const done = await env.DB.prepare("SELECT value FROM settings WHERE key='articles_seeded_v1'").first();
  if (done) return;
  await env.DB.batch([
    ...ARTICLES.map((a, i) => env.DB.prepare(
      'INSERT OR IGNORE INTO posts (slug,title,excerpt,body,author,published,seo_title,seo_description,published_at,tldr,takeaways_json,category,tags,focus_kw,img_alt,author_bio,image) VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(a.slug, a.title, a.excerpt, a.body, 'WinkCasa Team', a.seo_title, a.seo_description, sql(FIRST_DAY + i * 86400000), a.tldr, JSON.stringify(a.takeaways || []), a.category, a.tags, a.focus_kw, a.img_alt, BIO, '/articles/' + a.slug + '.jpg')),
    env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('articles_seeded_v1','1')"),
  ]);
}
