// Blog helpers + a few starter posts (edit or delete them from the admin).
const STARTERS = [
  { slug: 'how-to-build-a-simple-skincare-routine', title: 'How to build a simple skincare routine', author: 'WinkCasa Team',
    excerpt: 'A basic cleanse, treat, moisturise and protect routine is enough for most people. Here is how the steps fit together.',
    body: `A good skincare routine does not need ten products. Most people do well with four simple steps, done in the same order every day.

## 1. Cleanse
Wash your face with a gentle cleanser morning and night. The aim is to remove oil, sweat and dirt without leaving your skin tight or dry.

## 2. Treat
This is where a serum goes. Pick one product for one goal, such as brightening or oil balance, and use it consistently before adding anything else.

## 3. Moisturise
Even oily skin needs moisture. A light moisturiser helps your skin keep its barrier in good shape.

## 4. Protect
In the morning, finish with sunscreen. Apply enough to cover your face and neck, and reapply if you are outdoors for long.

## Tips for getting started
- Introduce one new product at a time, so you can tell how your skin reacts.
- Patch-test a new product on a small area first.
- Give a routine a few weeks before judging it.
- If you have a skin condition or a reaction that does not settle, speak to a doctor or dermatologist.

You can browse our [skincare collection](/c/skincare) to find products for each step.` },
  { slug: 'how-to-care-for-gold-plated-jewellery', title: 'How to care for gold-plated jewellery', author: 'WinkCasa Team',
    excerpt: 'Simple habits that help gold-plated earrings, necklaces and bracelets keep their shine for longer.',
    body: `Gold-plated jewellery has a thin gold layer over a base metal. With a little care, it can look good for a long time.

## Put it on last, take it off first
Apply perfume, hairspray and lotions before you wear your jewellery. Chemicals can dull the plating.

## Keep it dry
Take jewellery off before you shower, swim or exercise. Water, sweat and chlorine wear plating down faster.

## Clean it gently
Wipe each piece with a soft, dry cloth after wearing it. Avoid harsh cleaners and rough scrubbing.

## Store it well
Keep pieces separate in a small pouch or box so they do not scratch each other. A dry place helps prevent tarnish.

## A note on sensitive skin
Some people react to certain metals. If a piece irritates your skin, stop wearing it.

Explore our [jewellery collection](/c/jewellery) for everyday pieces.` },
  { slug: 'vitamin-c-serum-how-to-use-it', title: 'Vitamin C serum: how to use it', author: 'WinkCasa Team',
    excerpt: 'Why many people add a vitamin C serum to their morning routine, and a few easy tips for using it.',
    body: `Vitamin C serums are popular in morning routines, often chosen for brightening and for use alongside sunscreen.

## When to use it
Most people apply it in the morning, after cleansing and before moisturiser and sunscreen.

## How much to use
A few drops are usually enough for the face and neck. Spread it gently and let it absorb before the next step.

## Tips
- Start a few times a week and build up if your skin is comfortable.
- Patch-test first, especially if your skin is sensitive.
- Store the bottle closed, away from heat and direct sunlight.
- Always follow with sunscreen in the daytime.

If you notice stinging, redness or irritation that does not settle, stop using the product and speak to a doctor or pharmacist.

See our [skincare collection](/c/skincare) for serums and sunscreen.` },
];

export async function ensurePosts(env) {
  const done = await env.DB.prepare("SELECT value FROM settings WHERE key='posts_seeded'").first();
  if (done) return;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.batch([
    ...STARTERS.map((p, i) => env.DB.prepare(
      'INSERT OR IGNORE INTO posts (slug,title,excerpt,body,author,published,published_at) VALUES (?,?,?,?,?,1,?)')
      .bind(p.slug, p.title, p.excerpt, p.body, p.author, new Date(Date.parse(now.replace(' ', 'T') + 'Z') - i * 86400000).toISOString().slice(0, 19).replace('T', ' '))),
    env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('posts_seeded','1')"),
  ]);
}

import { ensureGuides } from './guides.js';

export async function publishedPosts(env) {
  await ensurePosts(env);
  await ensureGuides(env);
  const { results } = await env.DB.prepare("SELECT * FROM posts WHERE published=1 AND (published_at IS NULL OR published_at <= datetime('now')) ORDER BY published_at DESC, id DESC").all();
  return results;
}
