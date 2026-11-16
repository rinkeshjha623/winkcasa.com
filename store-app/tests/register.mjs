// Lets plain Node load the same files Cloudflare builds (they import products.json without an import attribute).
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
import fs from 'node:fs';
export async function load(url, ctx, next) {
  if (url.endsWith('.json')) return { format: 'module', shortCircuit: true, source: 'export default ' + fs.readFileSync(new URL(url), 'utf8') };
  return next(url, ctx);
}`), import.meta.url);
