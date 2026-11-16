import { getSettings, activeProducts, publicProduct } from '../../src/store.js';
import { cardHtml } from '../../src/seo.js';

// Personal picks for the home page. The browser sends only category names and product ids it remembers locally; nothing is stored here.
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const cats = (u.searchParams.get('c') || '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const ids = (u.searchParams.get('v') || '').split(',').map(Number).filter((n) => n > 0).slice(0, 12);
  const [rows, S] = await Promise.all([activeProducts(env), getSettings(env)]);
  const closed = !S.store.open;
  const prods = rows.map(publicProduct).filter((p) => p.image && !p.soldOut);
  const byId = new Map(prods.map((p) => [p.id, p]));
  const viewed = ids.map((i) => byId.get(i)).filter(Boolean).slice(0, 5);
  const seen = new Set(ids);
  const disc = (p) => (p.mrp && p.mrp > p.price ? (p.mrp - p.price) / p.mrp : 0);
  const pool = cats.map((c) => prods.filter((p) => p.room === c && !seen.has(p.id)).sort((a, b) => disc(b) - disc(a)));
  const forYou = [...(pool[0] || []).slice(0, 8), ...(pool[1] || []).slice(0, 4)];
  const collage = [];
  for (const p of [...viewed, ...forYou]) { if (collage.length < 3 && !collage.some((c) => c.image === p.image)) collage.push({ url: p.url, image: p.image, name: p.name }); }
  const h = JSON.stringify({
    viewed: viewed.map((p) => cardHtml(p, closed)).join(''),
    forYou: forYou.length >= 4 ? forYou.map((p) => cardHtml(p, closed)).join('') : '',
    collage: collage.length === 3 ? collage : [],
    top: cats[0] || '',
  });
  return new Response(h, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
