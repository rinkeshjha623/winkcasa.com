import { BANDS, bandPath } from '../../src/budget.js';

// Old /under/499 addresses now point at the matching price range page.
export async function onRequestGet({ params }) {
  const n = Number(params.max);
  const b = BANDS.find((x) => x.max === n) || BANDS.find((x) => x.max >= n) || BANDS[0];
  return Response.redirect('https://www.winkcasa.com' + bandPath(b), 301);
}
