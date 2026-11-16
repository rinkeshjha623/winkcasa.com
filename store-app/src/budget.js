// Shop-by-price ranges, chosen from the real price spread (cheapest about Rs 289, median about Rs 640).
// Ranges do not overlap, so every page shows different products.
export const BANDS = [
  { id: 'under-399', min: 0, max: 399, label: 'Under ₹399', small: 'Under', big: '₹399' },
  { id: '400-499', min: 400, max: 499, label: '₹400 to ₹499', small: '₹400 to', big: '₹499' },
  { id: '500-699', min: 500, max: 699, label: '₹500 to ₹699', small: '₹500 to', big: '₹699' },
  { id: '700-999', min: 700, max: 999, label: '₹700 to ₹999', small: '₹700 to', big: '₹999' },
  { id: '1000-and-above', min: 1000, max: Infinity, label: '₹1,000 and above', small: 'Above', big: '₹1,000' },
];
export const bandPath = (b) => '/price/' + b.id;
export const bandById = (id) => BANDS.find((b) => b.id === id);
export const inBand = (prods, b) => prods.filter((p) => p.price && p.price >= b.min && p.price <= b.max);

export function budgetStripHtml(prods) {
  const t = BANDS.map((b) => ({ b, c: inBand(prods, b).length })).filter((x) => x.c >= 3);
  if (!t.length) return '';
  return `<section class="budget wrap" aria-label="Shop by price"><h2>Shop by price</h2><nav class="ruler" aria-label="Price ranges">${t.map((x) => `<a class="rstop" href="${bandPath(x.b)}"><i class="rdot" aria-hidden="true"></i><small>${x.b.small}</small><b>${x.b.big}</b><span>${x.c} styles</span></a>`).join('')}</nav></section>`;
}
