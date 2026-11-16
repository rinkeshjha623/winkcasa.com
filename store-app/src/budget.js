// Shop-by-budget bands, chosen from the real price spread (cheapest item is about Rs 289, median about Rs 640).
export const BANDS = [399, 499, 699, 999];
export const bandPath = (n) => '/under/' + n;
export const inBand = (prods, n) => prods.filter((p) => p.price && p.price <= n);

export function budgetStripHtml(prods) {
  const t = BANDS.map((n) => ({ n, c: inBand(prods, n).length })).filter((b) => b.c >= 3);
  if (!t.length) return '';
  return `<section class="budget wrap" aria-label="Shop by budget"><h2>Shop by budget</h2><div class="budgetgrid">${t.map((b) => `<a class="budgetcard" href="${bandPath(b.n)}"><small>Under</small><b>₹${b.n}</b><span>${b.c} styles</span></a>`).join('')}</div></section>`;
}
