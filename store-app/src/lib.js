export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

const enc = new TextEncoder();

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Prices always come from products.json on the server, never from the browser.
export function priceCart(catalog, items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return { error: 'Your cart is empty.' };
  }
  const lines = [];
  let subtotal = 0;
  for (const it of items) {
    const p = catalog.products.find((x) => x.id === Number(it.id));
    const qty = Number(it.qty);
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > 10) {
      return { error: 'One of the items in your cart is no longer available.' };
    }
    lines.push({ id: p.id, name: p.name, qty, unitPaise: p.price * 100 });
    subtotal += p.price * 100 * qty;
  }
  const shipping = subtotal >= catalog.config.freeShippingAbove * 100 ? 0 : catalog.config.shipping * 100;
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

export function cleanCustomer(c) {
  const t = (v, max) => String(v ?? '').trim().slice(0, max);
  const out = {
    name: t(c?.name, 80), phone: t(c?.phone, 15).replace(/[\s-]/g, ''), email: t(c?.email, 120),
    address: t(c?.address, 300), city: t(c?.city, 60), state: t(c?.state, 60), pincode: t(c?.pincode, 6),
  };
  if (out.name.length < 2) return { error: 'Enter your full name.' };
  if (!/^(\+91)?[6-9]\d{9}$/.test(out.phone)) return { error: 'Enter a valid 10-digit mobile number.' };
  if (!/^\S+@\S+\.\S+$/.test(out.email)) return { error: 'Enter a valid email address.' };
  if (out.address.length < 8) return { error: 'Enter your full delivery address.' };
  if (!/^[1-9]\d{5}$/.test(out.pincode)) return { error: 'Enter a valid 6-digit pincode.' };
  if (!out.city || !out.state) return { error: 'Enter your city and state.' };
  return { value: out };
}
