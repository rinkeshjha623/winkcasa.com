import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, headTags, pageShell } from '../src/seo.js';

// /cart — the cart and checkout page. The cart itself lives in the shopper's browser.
export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const main = `<main class="wrap" id="cartPage"><div class="cathead"><p class="label">Checkout</p><h1>Your cart</h1></div><div id="cartRoot"><noscript><p>Please turn on JavaScript to use the cart.</p></noscript></div></main>`;
  const html = pageShell({
    head: headTags({ title: 'Your cart | WinkCasa', description: 'Review your WinkCasa cart and pay securely by UPI, card or net banking. Delivered within 10 to 20 days across India.', canonical: SITE + '/cart', noindex: true }),
    S, cats, main, scripts: '<script src="https://checkout.razorpay.com/v1/checkout.js"></script><script src="/cartpage.js" defer></script>',
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
