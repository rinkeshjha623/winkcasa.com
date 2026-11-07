import { maybeRunDue } from '../src/social.js';
import { maybeRunAgent } from '../src/agent.js';

// Backup for the scheduler: when someone opens a page and a social post is overdue, publish it.
// GitHub's schedule can run hours late on quiet repositories, so this keeps posts close to their time.
// Old Shopify-era URLs that Google still remembers: send the useful ones to their new home, retire the rest.
const PAGES = { 'about-us': '/about', 'frequently-asked-questions': '/contact', 'contact-us': '/contact', 'contact': '/contact', 'shipping-policy': '/shipping', 'refund-policy': '/returns', 'privacy-policy': '/privacy', 'terms-of-service': '/terms' };
function legacy(url) {
  const path = url.pathname.replace(/\/+$/, '');
  let m;
  if ((m = path.match(/^\/pages\/([^/]+)$/))) return { to: PAGES[m[1]] || '/' };
  if (path === '/collections' || path === '/collections/all') return { to: '/' };
  if ((m = path.match(/^\/collections\/([^/]+)/))) return { to: /massag|roller|gua|face/.test(m[1]) ? '/face-rollers-and-massagers' : /earring/.test(m[1]) ? '/earrings-for-women' : /necklace/.test(m[1]) ? '/necklaces-for-women' : /ring/.test(m[1]) ? '/rings-for-women' : /hair|clip/.test(m[1]) ? '/hair-clips-for-women' : /dress/.test(m[1]) ? '/dresses-for-women' : '/' };
  if (path === '/blog/vitamin-c-serum-how-to-use-it') return { to: '/blog' };
  if (/^\/(products|categories)\//.test(path)) return { gone: true };
  return null;
}

export async function onRequest({ request, env, next, waitUntil }) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const l = legacy(new URL(request.url));
    if (l && l.to) return Response.redirect(new URL(l.to, request.url).toString(), 301);
    if (l && l.gone) return new Response('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page removed | WinkCasa</title><p style="font:16px sans-serif;padding:40px">This product is no longer sold. <a href="/">Browse WinkCasa</a>.</p>', { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const res = await next();
  if (request.method === 'GET' && env.DB && (res.headers.get('content-type') || '').includes('text/html')) { waitUntil(maybeRunDue(env)); waitUntil(maybeRunAgent(env)); }
  return res;
}
