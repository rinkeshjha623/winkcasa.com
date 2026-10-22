import { getSettings, activeProducts, parseProduct, categoriesOf, productPath } from '../src/store.js';
import { SITE } from '../src/seo.js';
import { publishedPosts } from '../src/blog.js';

// llms.txt: a plain-text summary of the store for AI assistants (ChatGPT, Claude, Perplexity, Gemini...).
export async function onRequestGet({ env }) {
  const [rows, S, posts] = await Promise.all([activeProducts(env), getSettings(env), publishedPosts(env)]);
  const b = S.business, cats = categoriesOf(rows, S);
  const money = (n) => 'INR ' + n;
  const t = `# WinkCasa

> WinkCasa is an online store in New Delhi, India selling skincare, beauty tools and everyday jewellery. Prices are in Indian rupees (INR) and include GST. We deliver across India.

## Business details
- Trading name: ${b.name} (${b.legalName})
- Address: ${b.street}, ${b.city}, ${b.state} ${b.postcode}, India
- Email: ${b.email}
- Phone: ${b.phone}
${b.gstin ? `- GSTIN: ${b.gstin}\n` : ''}- Website: ${SITE}/

## Key facts
- Delivery: across India to serviceable pincodes. Free above ${money(S.shipping.freeShippingAbove)}, otherwise ${money(S.shipping.charge)}.
- Delivery: within 3 to 7 days of the order. The expected delivery dates are shown at checkout and in the order confirmation.
- Payment options: UPI, credit and debit cards, net banking (processed by Razorpay).
- Returns: 7 days for items that arrive damaged, defective or wrong. See ${SITE}/returns
- Payment: online through Razorpay at checkout.

## Collections
${cats.map((c) => `- [${c.name}](${SITE}${c.path}): ${c.description}`).join('\n')}

## Products
${rows.map(parseProduct).map((p) => `- [${p.name}](${SITE}${productPath(p)}): ${money(p.price)}${p.mrp > p.price ? ` (MRP ${money(p.mrp)})` : ''}. ${p.category}. ${p.description}${p.stock !== null && p.stock <= 0 ? ' Currently sold out.' : ''}`).join('\n')}

## Guides
${posts.map((p) => `- [${p.title}](${SITE}/blog/${p.slug}): ${p.excerpt}`).join('\n')}

## Pages
- [About us](${SITE}/about)
- [Contact us](${SITE}/contact)
- [Track an order](${SITE}/track)

## Policies
- [Shipping and delivery](${SITE}/shipping)
- [Returns and refunds](${SITE}/returns)
- [Privacy policy](${SITE}/privacy)
- [Terms of sale](${SITE}/terms)
- [Contact](${SITE}/contact)

## Frequently asked questions
${S.faq.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}
`;
  return new Response(t, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
