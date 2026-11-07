// Tiny text-to-PNG renderer that runs in a Cloudflare Worker (no canvas needed): blits pre-rendered Inter glyphs into an RGBA buffer and encodes a PNG.
import { ATLAS } from './font-atlas.js';

const dec = {};
const glyph = (font, ch) => {
  const F = ATLAS[font], g = F.g[ch] || F.g['?'] || F.g[' ']; const k = font + ch;
  if (g[5] && !dec[k]) { const s = atob(g[5]); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); dec[k] = a; }
  return { adv: g[0], x: g[1], y: g[2], w: g[3], h: g[4], a: dec[k] };
};
export const measure = (text, font) => { let w = 0; for (const ch of text) w += glyph(font, ch).adv; return w; };
export function wrap(text, font, maxW, maxLines) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (measure(t, font) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); let last = keep[maxLines - 1]; while (last.length > 1 && measure(last + '…', font) > maxW) last = last.slice(0, -1).trimEnd(); keep[maxLines - 1] = last + '…'; return keep; }
  return lines;
}
let T; const crc = (u) => { if (!T) { T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } } let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const o = new Uint8Array(12 + data.length), v = new DataView(o.buffer); v.setUint32(0, data.length); for (let i = 0; i < 4; i++) o[4 + i] = type.charCodeAt(i); o.set(data, 8); v.setUint32(8 + data.length, crc(o.subarray(4, 8 + data.length))); return o; };
async function encodePng(w, h, rgba) {
  const raw = new Uint8Array((w * 4 + 1) * h); for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer); v.setUint32(0, w); v.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
// items: [{ text, font:'bold'|'bold2'|'med'|'cap', color:[r,g,b], x, y (top of first line), maxW, maxLines, lineGap, align:'left'|'center', spacing }]
// Returns a transparent PNG of w x h with the text on it.
export async function renderText(w, h, items) {
  const px = new Uint8Array(w * h * 4);
  for (const it of items) {
    const F = ATLAS[it.font], lines = it.maxW ? wrap(it.text, it.font, it.maxW, it.maxLines || 1) : [it.text]; let y = it.y;
    for (const line of lines) {
      const sp = it.spacing || 0, lw = measure(line, it.font) + sp * Math.max(0, line.length - 1);
      let x = it.align === 'center' ? it.x + ((it.maxW || 0) - lw) / 2 : it.x; const base = Math.round(y + F.asc);
      for (const ch of line) {
        const g = glyph(it.font, ch);
        if (g.a) for (let gy = 0; gy < g.h; gy++) { const py = base + g.y + gy; if (py < 0 || py >= h) continue; for (let gx = 0; gx < g.w; gx++) { const a = g.a[gy * g.w + gx]; if (!a) continue; const qx = Math.round(x + g.x + gx); if (qx < 0 || qx >= w) continue; const i = (py * w + qx) * 4, da = px[i + 3]; const na = a + da * (255 - a) / 255; px[i] = it.color[0]; px[i + 1] = it.color[1]; px[i + 2] = it.color[2]; px[i + 3] = Math.min(255, Math.round(na)); } }
        x += g.adv + sp;
      }
      y += F.lh + (it.lineGap || 0);
    }
  }
  return encodePng(w, h, px);
}
