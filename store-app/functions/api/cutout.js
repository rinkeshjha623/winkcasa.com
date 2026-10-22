// Same-origin image relay so the browser can read product pixels (for the virtual try-on) without canvas tainting.
const OK = (h) => h === 'images.unsplash.com' || h === 'cjdropshipping.com' || h.endsWith('.cjdropshipping.com');
export async function onRequestGet({ request }) {
  let u;
  try { u = new URL(new URL(request.url).searchParams.get('u') || ''); } catch { return new Response('Bad url', { status: 400 }); }
  if (u.protocol !== 'https:' || !OK(u.hostname)) return new Response('Not allowed', { status: 403 });
  const r = await fetch(u.toString(), { cf: { cacheEverything: true, cacheTtl: 604800 } });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) return new Response('Not an image', { status: 415 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 6e6) return new Response('Too large', { status: 413 });
  return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=604800', 'X-Content-Type-Options': 'nosniff' } });
}
