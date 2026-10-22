import { json } from '../../src/lib.js';
import { activeProducts, getSettings, publicProduct } from '../../src/store.js';

// Public: what the storefront shows. Edited from /admin.
export async function onRequestGet({ env }) {
  const [rows, settings] = await Promise.all([activeProducts(env), getSettings(env)]);
  return json({
    settings,
    config: { freeShippingAbove: settings.shipping.freeShippingAbove, shipping: settings.shipping.charge },
    products: rows.map(publicProduct),
  });
}
