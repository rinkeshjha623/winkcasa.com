import { getSettings, activeProducts, categoriesOf } from '../src/store.js';
import { SITE, headTags, pageShell } from '../src/seo.js';

// /account — login, sign up and the customer dashboard. The page is a shell; public/account.js fills it in.
export async function onRequestGet({ env }) {
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const cats = categoriesOf(rows, S);
  const main = `<main class="wrap" id="acct"><div class="cathead"><p class="label">Your WinkCasa</p><h1 id="acctH">My account</h1></div><div id="acctRoot"><noscript><p>Please turn on JavaScript to use your account.</p></noscript></div></main>`;
  const html = pageShell({
    head: headTags({ title: 'My account | WinkCasa', description: 'Log in or create a WinkCasa account to see your orders, saved addresses and wishlist.', canonical: SITE + '/account', noindex: true }),
    S, cats, main, scripts: '<script src="/account.js" defer></script>',
  });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
