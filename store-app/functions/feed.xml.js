import { getSettings, activeProducts, publicProduct } from '../src/store.js';
import { SITE, esc } from '../src/seo.js';
import { JTYPES, jtypeOf } from '../src/jtypes.js';

// /feed.xml : Google Merchant Center product feed (Shopping, Performance Max).
const GCAT = { Jewellery: 'Apparel & Accessories > Jewelry', 'Hair & Accessories': 'Apparel & Accessories > Clothing Accessories > Hair Accessories', 'Beauty Tools': 'Health & Beauty > Personal Care', 'Dresses & Ethnic Wear': 'Apparel & Accessories > Clothing > Dresses', 'Bags & Potlis': 'Apparel & Accessories > Handbags, Wallets & Cases', 'Festive Decor': 'Home & Garden > Decor' };
const jt = (p) => JTYPES[jtypeOf(p.name, p.room)] || null;
const ptype = (p) => (jt(p) ? `${p.room} > ${jt(p).short}` : p.room);
const GL = Object.fromEntries(Object.entries(GCAT).map(([k, v]) => [k.toLowerCase(), v]));
const gcat = (p) => (/\bpants\b/i.test(p.name) ? 'Apparel & Accessories > Clothing > Pants' : /\bskirt\b/i.test(p.name) ? 'Apparel & Accessories > Clothing > Skirts' : /cardigan/i.test(p.name) ? 'Apparel & Accessories > Clothing > Outerwear' : /jumpsuit/i.test(p.name) ? 'Apparel & Accessories > Clothing > One-Pieces' : jt(p) ? jt(p).gcat : (p.room === 'Lanterns & Lights' ? 'Home & Garden > Lighting' : GL[String(p.room).toLowerCase()]));
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const ship = S.shipping.charge, items = rows.map(publicProduct).filter((p) => p.image && p.price > 0).map((p) => {
    let d = clean(p.dim); if (d.length > 400 || /:/.test(d) || d.length < 20) d = `${p.name}. Shop ${p.room.toLowerCase()} online at WinkCasa, delivered across India in 10 to 20 days with easy returns.`;
    return `<item><g:id>${p.id}</g:id><g:title>${esc(clean(p.name).slice(0, 150))}</g:title><g:description>${esc(d.slice(0, 4900))}</g:description><g:link>${esc(SITE + p.url)}</g:link><g:image_link>${esc(p.image)}</g:image_link>${(p.images || []).slice(1, 6).map((i) => `<g:additional_image_link>${esc(i)}</g:additional_image_link>`).join('')}<g:availability>${p.soldOut ? 'out of stock' : 'in stock'}</g:availability><g:price>${(p.mrp || p.price).toFixed(2)} INR</g:price>${p.mrp ? `<g:sale_price>${p.price.toFixed(2)} INR</g:sale_price>` : ''}<g:brand>WinkCasa</g:brand><g:condition>new</g:condition><g:identifier_exists>no</g:identifier_exists><g:product_type>${esc(ptype(p))}</g:product_type>${gcat(p) ? `<g:google_product_category>${esc(gcat(p))}</g:google_product_category>` : ''}<g:shipping><g:country>IN</g:country><g:service>Standard</g:service><g:price>${p.price >= S.shipping.freeShippingAbove ? '0.00' : Number(ship).toFixed(2)} INR</g:price></g:shipping></item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>WinkCasa</title><link>${SITE}</link><description>WinkCasa product feed</description>${items.join('')}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' } });
}
