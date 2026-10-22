// Same-origin image relay so the browser can read product pixels (for the virtual try-on) without canvas tainting.
const OK = (h) => h === 'images.unsplash.com' || h === 'cjdropshipping.com' || h.endsWith('.cjdropshipping.com');
export async function onRequestGet({ request }) {
  let u;
  try { u = new URL(new URL(request.url).searchParams.get('u') || ''); } catch { return new Response('Bad url', { status: 400 }); }
  if (u.protocol !== 'https:' || !OK(u.hostname)) return new Response('Not allowed', { status: 403 });
  const r = await fetch(u.toString(), { cf: { cacheEverything: true, cacheTtl: 604800 } });
  if (!r.ok) return new Response('Upstream error', { status: 502 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 6e6) return new Response('Too large', { status: 413 });
  const b = new Uint8Array(buf.slice(0, 12));
  const type = b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0x47 && b[1] === 0x49 ? 'image/gif'
    : b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45 ? 'image/webp' : '';
  if (!type) return new Response('Not an image', { status: 415 });
  return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=604800', 'X-Content-Type-Options': 'nosniff' } });
}
