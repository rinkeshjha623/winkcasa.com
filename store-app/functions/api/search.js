import { json } from '../../src/lib.js';
import { activeProducts, publicProduct, searchProducts } from '../../src/store.js';

// Public: instant product suggestions for the header search box.
export async function onRequestGet({ env, request }) {
  const q = new URL(request.url).searchParams.get('q') || '';
  const rows = await activeProducts(env);
  const out = searchProducts(rows, q, 6).map(publicProduct).map((p) => ({ name: p.name, url: p.url, price: p.price, image: p.image, room: p.room }));
  return json({ q, results: out });
}
