import seed from '../public/products.json';

export const DEFAULTS = {
  announcement: { enabled: false, text: '', link: '' },
  header: { links: [{ label: 'Shop', href: '#shop' }, { label: 'Promise', href: '#promise' }] },
  hero: {
    eyebrow: 'WinkCasa Retail · New Delhi',
    headline: 'Beauty and jewellery,',
    accent: 'chosen with care.',
    text: 'Skincare, beauty tools and everyday jewellery, picked for what India reorders most.',
    ctaLabel: 'Shop the collection', ctaLink: '#shop',
    facts: ['**Free delivery** above ₹999', '**7-day** returns on damaged or wrong items'],
  },
  collection: { label: 'The collection', title: 'Pieces we keep restocking' },
  promise: [
    { title: 'Chosen by demand', text: 'We stock skincare and jewellery, two of the categories Indian shoppers buy online most often.' },
    { title: 'Packed to arrive', text: 'Glass bottles and delicate jewellery ship in padded, double-wall boxes.' },
    { title: 'Easy returns', text: 'If an item arrives damaged, defective or wrong, tell us within 7 days and we will replace it or refund you.' },
  ],
  footer: {
    copyright: '© WinkCasa Retail',
    links: [
      { label: 'Returns', href: '/returns' }, { label: 'Shipping', href: '/shipping' }, { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' }, { label: 'Contact', href: '/contact' },
    ],
    note: 'Prices in Indian rupees, inclusive of GST.',
    showUnsplash: true,
  },
  shipping: { freeShippingAbove: 999, charge: 79 },
  store: { open: true, closedMessage: 'We are restocking and will be back soon. Please check again shortly.' },
};

export function safeHref(v) {
  const s = String(v ?? '').trim().slice(0, 300);
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(s) ? s : '';
}

// Force a value to the same shape/types as the default, so bad input can never break the storefront.
function coerce(def, val, key = '') {
  if (typeof def === 'string') {
    const s = String(val ?? def).trim().slice(0, 500);
    return /^(href|link|ctaLink)$/.test(key) ? safeHref(s) : s;
  }
  if (typeof def === 'boolean') return val === undefined ? def : !!val;
  if (typeof def === 'number') { const n = Math.round(Number(val)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000000) : def; }
  if (Array.isArray(def)) {
    const arr = Array.isArray(val) ? val.slice(0, 12) : def;
    return arr.map((v) => coerce(def[0], v));
  }
  const out = {};
  for (const k of Object.keys(def)) out[k] = coerce(def[k], val?.[k], k);
  return out;
}
export const cleanSettings = (input) => coerce(DEFAULTS, input);

export async function ensureSeeded(env) {
  const done = await env.DB.prepare("SELECT value FROM settings WHERE key='seeded'").first();
  if (done) return;
  const stmts = seed.products.map((p, i) =>
    env.DB.prepare(`INSERT OR IGNORE INTO products (id,name,category,price,description,tag,images_json,sort) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(p.id, p.name, p.room, p.price, p.dim || '', p.tag || null, JSON.stringify(p.image ? [p.image] : []), i));
  stmts.push(env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('seeded','1')"));
  await env.DB.batch(stmts);
}

export async function getSettings(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='site'").first();
  let saved = {};
  try { saved = row ? JSON.parse(row.value) : {}; } catch {}
  return cleanSettings(saved);
}

const artFor = (cat) => (/jewel/i.test(cat) ? 'earrings' : /tool/i.test(cat) ? 'gua' : 'serum');

export function parseProduct(r) {
  let images = [];
  try { images = JSON.parse(r.images_json) || []; } catch {}
  return { ...r, images, images_json: undefined };
}

// Shape the storefront expects (never includes cost or supplier).
export function publicProduct(r) {
  const p = parseProduct(r);
  return {
    id: p.id, name: p.name, room: p.category, price: p.price, mrp: p.mrp && p.mrp > p.price ? p.mrp : null,
    dim: p.description, tag: p.tag || '', image: p.images[0] || '', images: p.images,
    tile: (p.id % 4) + 1, obj: (p.id % 4) + 1, art: artFor(p.category),
    soldOut: p.stock !== null && p.stock <= 0,
  };
}

export async function activeProducts(env) {
  await ensureSeeded(env);
  const { results } = await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY sort, id').all();
  return results;
}
