import seed from '../public/products.json';

export const DEFAULTS = {
  announcement: { enabled: false, text: '', link: '' },
  hero: {
    eyebrow: 'WinkCasa Retail · New Delhi',
    headline: 'Beauty and jewellery,',
    accent: 'chosen with care.',
    text: 'Skincare, beauty tools and everyday jewellery, picked for what India reorders most.',
    ctaLabel: 'Shop the collection', ctaLink: '#shop',
    facts: ['**Delivered in 10–20 days** across India', '**Free delivery** above ₹999', '**7-day** returns on damaged or wrong items'],
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
      { label: 'Track your order', href: '/track' }, { label: 'About us', href: '/about' }, { label: 'Blog', href: '/blog' }, { label: 'Contact us', href: '/contact' },
      { label: 'Returns', href: '/returns' }, { label: 'Shipping', href: '/shipping' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' },
    ],
    note: 'Prices in Indian rupees, inclusive of GST.',
    showUnsplash: true,
  },
  shipping: { freeShippingAbove: 999, charge: 79 },
  seo: {
    title: 'WinkCasa | Skincare, beauty tools and jewellery online in India',
    description: 'Shop skincare, beauty tools and everyday jewellery online at WinkCasa. Free delivery above ₹999 across India, secure online payment and 7-day returns on damaged or wrong items.',
    ogImage: '',
  },
  business: {
    name: 'WinkCasa Retail', legalName: 'Rinkesh Kumar Jha, trading as WinkCasa Retail', gstin: '07AURPJ3347A1ZQ',
    street: '155-156, Shyam Sarovar Apartment, Patparganj', city: 'Delhi', state: 'Delhi', postcode: '110091',
    phone: '+91 9798776985', email: 'support@winkcasa.com', hours: '', grievanceOfficer: 'Rinkesh Jha',
  },
  social: { instagram: '', facebook: '', youtube: '', whatsapp: '' },
  contact: {
    label: 'We are here to help',
    title: 'Contact us',
    intro: 'Questions about an order, a product or delivery? Send us a message and we will reply by email or phone.',
    extra: 'We usually reply within one working day.',
    successMessage: 'Thank you. We have your message and will reply soon.',
    seoTitle: 'Contact WinkCasa | Customer support',
    seoDescription: '',
  },
  about: {
    title: 'About WinkCasa',
    text: 'WinkCasa is an online store based in New Delhi, India. We sell skincare, beauty tools and everyday jewellery, chosen for what shoppers reorder most. We deliver across India within 10 to 20 days, show prices in Indian rupees including GST, and take payment securely online by UPI, card or net banking through Razorpay. If an item arrives damaged, defective or wrong, tell us within 7 days and we will replace it or refund you.',
  },
  faq: [
    { q: 'Do you deliver across India?', a: 'Yes. We deliver to serviceable pincodes across India. Delivery is free on orders of ₹999 and above, and costs ₹79 below that.' },
    { q: 'How long does delivery take?', a: 'Your order is delivered within 10 to 20 days of placing it, depending on your location. Your expected delivery dates are shown at checkout and in your order confirmation.' },
    { q: 'What is the return policy?', a: 'If an item arrives damaged, defective or wrong, tell us within 7 days and we will replace it or refund you. Full details are on our Returns page.' },
    { q: 'How can I pay?', a: 'You can pay by UPI, credit or debit card, or net banking. Payment is taken securely online through Razorpay when you check out.' },
    { q: 'Are prices inclusive of GST?', a: 'Yes. All prices are in Indian rupees and include GST.' },
    { q: 'How do I contact WinkCasa?', a: 'Email support@winkcasa.com or visit our Contact page. We reply to every message.' },
  ],
  categories: [
    { name: 'Skincare', description: 'Serums, sunscreen, face mists and face oils for everyday skincare routines, delivered across India.' },
    { name: 'Beauty tools', description: 'Facial massagers and simple beauty tools that make your daily routine easier.' },
    { name: 'Jewellery', description: 'Lightweight everyday jewellery: earrings, necklaces, bracelets and rings you can wear daily.' },
  ],
  store: { open: true, closedMessage: 'We are restocking and will be back soon. Please check again shortly.' },
};

export function safeHref(v) {
  const s = String(v ?? '').trim().slice(0, 300);
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(s) ? s : '';
}

// Force a value to the same shape/types as the default, so bad input can never break the storefront.
function coerce(def, val, key = '') {
  if (typeof def === 'string') {
    const max = /^(a|text|details)$/.test(key) ? 1500 : 500;
    const s = String(val ?? def).trim().slice(0, max);
    return /^(href|link|ctaLink|instagram|facebook|youtube|whatsapp|ogImage)$/.test(key) ? safeHref(s) : s;
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

const j = (v) => { try { return JSON.parse(v) || []; } catch { return []; } };

export function slugify(t) {
  return String(t || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
}
export const productPath = (p) => `/p/${p.id}-${slugify(p.name)}`;
export const categoryPath = (name) => `/c/${slugify(name)}`;

export function parseProduct(r) {
  return { ...r, images: j(r.images_json), highlights: j(r.highlights_json), faq: j(r.faq_json),
    images_json: undefined, highlights_json: undefined, faq_json: undefined };
}

// Categories in use, with their editable descriptions.
export function categoriesOf(rows, settings) {
  const names = [...new Set(rows.map((r) => r.category))];
  return names.map((name) => ({
    name, slug: slugify(name), path: categoryPath(name),
    description: settings.categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.description
      || `Shop ${name} online at WinkCasa with delivery across India.`,
  }));
}

// Shape the storefront expects (never includes cost or supplier).
export function publicProduct(r) {
  const p = parseProduct(r);
  return {
    id: p.id, name: p.name, room: p.category, price: p.price, mrp: p.mrp && p.mrp > p.price ? p.mrp : null,
    dim: p.description, tag: p.tag || '', url: productPath(p), image: p.images[0] || '', images: p.images,
    tile: (p.id % 4) + 1, obj: (p.id % 4) + 1, art: artFor(p.category),
    soldOut: p.stock !== null && p.stock <= 0,
  };
}

export async function activeProducts(env) {
  await ensureSeeded(env);
  const { results } = await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY sort, id').all();
  return results;
}

// Promise: delivered within 10 to 20 days of the order. Earliest = order + 10 days; latest = 9 PM IST on day 20.
export function deliveryWindow(from = new Date()) {
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  const min = new Date(from.getTime() + 10 * 86400000);
  const max = new Date(from.getTime() + 20 * 86400000);
  max.setUTCHours(15, 30, 0, 0); // 21:00 IST
  return { min: fmt(min), max: fmt(max) };
}

/* ---------- tiny, safe markdown for blog posts: ## headings, - lists, **bold**, [text](url) ---------- */
const escHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inline = (t) => escHtml(t)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, '<a href="$2">$1</a>');
export function markdown(src) {
  const out = []; let list = [];
  const flush = () => { if (list.length) { out.push('<ul>' + list.map((l) => `<li>${inline(l)}</li>`).join('') + '</ul>'); list = []; } };
  for (const block of String(src || '').split(/\n{2,}/)) {
    for (const line of block.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (/^- /.test(t)) { list.push(t.slice(2)); continue; }
      flush();
      if (/^## /.test(t)) out.push(`<h2>${inline(t.slice(3))}</h2>`);
      else if (/^### /.test(t)) out.push(`<h3>${inline(t.slice(4))}</h3>`);
      else out.push(`<p>${inline(t)}</p>`);
    }
    flush();
  }
  return out.join('\n');
}
export const wordsOf = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
