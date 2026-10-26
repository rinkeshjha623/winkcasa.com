// CJ Dropshipping API client + margin pricing. Key lives in the CJ_API_KEY secret, never in the browser.
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

export const CJ_DEFAULTS = {
  fx: 88,              // INR per USD
  fxBufferPct: 3,      // safety buffer on the exchange rate
  shipInr: 250,        // fallback CJ shipping to India per unit if the freight quote fails
  packingInr: 30,      // packing / misc per order line
  payFeePct: 2.36,     // Razorpay fee incl. GST
  mrpUpliftPct: 40,    // MRP shown struck-through = price + this %
  defaultMarginPct: 35,
  margins: { Skincare: 30, 'Beauty tools': 35, Jewellery: 40, 'Dresses & Ethnic Wear': 35, 'Bags & Potlis': 40, 'Festive Decor': 40 },
};

export async function getCjConfig(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='cj_config'").first();
  let saved = {}; try { saved = row ? JSON.parse(row.value) : {}; } catch {}
  const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : d; };
  const margins = {};
  for (const [k, v] of Object.entries({ ...CJ_DEFAULTS.margins, ...(saved.margins || {}) })) {
    const key = String(k).trim().slice(0, 40); if (key) margins[key] = num(v, CJ_DEFAULTS.defaultMarginPct, 1, 90);
  }
  return {
    fx: num(saved.fx, CJ_DEFAULTS.fx, 20, 500), fxBufferPct: num(saved.fxBufferPct, CJ_DEFAULTS.fxBufferPct, 0, 30),
    shipInr: num(saved.shipInr, CJ_DEFAULTS.shipInr, 0, 5000), packingInr: num(saved.packingInr, CJ_DEFAULTS.packingInr, 0, 1000),
    payFeePct: num(saved.payFeePct, CJ_DEFAULTS.payFeePct, 0, 10), mrpUpliftPct: num(saved.mrpUpliftPct, CJ_DEFAULTS.mrpUpliftPct, 0, 300),
    defaultMarginPct: num(saved.defaultMarginPct, CJ_DEFAULTS.defaultMarginPct, 1, 90), margins,
  };
}

export const marginFor = (cfg, category) => {
  const hit = Object.keys(cfg.margins).find((k) => k.toLowerCase() === String(category || '').toLowerCase());
  return hit ? cfg.margins[hit] : cfg.defaultMarginPct;
};

// Landed cost in rupees: supplier price at a buffered rate + CJ shipping + packing.
export const landedInr = (cfg, usd, shipInr) =>
  Math.ceil(usd * cfg.fx * (1 + cfg.fxBufferPct / 100) + (shipInr ?? cfg.shipInr) + cfg.packingInr);

// price = cost / (1 - gateway fee - margin), then rounded up to end in 9.
export function priceFor(cfg, category, costInr, marginOverride) {
  const m = (marginOverride ?? marginFor(cfg, category)) / 100;
  const raw = costInr / (1 - cfg.payFeePct / 100 - m);
  const price = Math.ceil((raw + 1) / 10) * 10 - 1;
  const mrp = Math.ceil((price * (1 + cfg.mrpUpliftPct / 100) + 1) / 10) * 10 - 1;
  return { price, mrp, profit: Math.round(price * (1 - cfg.payFeePct / 100) - costInr) };
}

async function token(env) {
  const key = env.CJ_API_KEY;
  if (!key) { const e = new Error('CJ is not connected: add the CJ_API_KEY secret in Cloudflare and redeploy.'); e.code = 'nokey'; throw e; }
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='cj_token'").first();
  try { const t = JSON.parse(row?.value || '{}'); if (t.at && t.exp && Date.parse(t.exp) - Date.now() > 86400000) return t.at; } catch {}
  const r = await fetch(BASE + '/authentication/getAccessToken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }) });
  const j = await r.json().catch(() => ({}));
  if (!j?.data?.accessToken) throw new Error('CJ rejected the API key: ' + (j.message || r.status));
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('cj_token', ?)")
    .bind(JSON.stringify({ at: j.data.accessToken, exp: j.data.accessTokenExpiryDate })).run();
  return j.data.accessToken;
}

export async function cj(env, method, path, { query, body } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== '') url.searchParams.set(k, v);
  const headers = { 'CJ-Access-Token': await token(env) };
  if (body) headers['Content-Type'] = 'application/json';
  let r, j;
  for (let i = 0; i < 3; i++) { // CJ allows about 1 request per second
    r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    j = await r.json().catch(() => ({}));
    if (r.status !== 429 && !/too many/i.test(j?.message || '')) break;
    await new Promise((res) => setTimeout(res, 1200));
  }
  if (j?.result === false || (j?.code && j.code !== 200)) throw new Error('CJ: ' + (j.message || 'request failed'));
  return j.data;
}

const num = (v) => { const n = parseFloat(String(v ?? '').split('-')[0]); return Number.isFinite(n) ? n : 0; };
export const usdOf = num;

// Cheapest CJ shipping line to India for a set of variants. Returns { name, inr, days } or null.
export async function freightToIndia(env, cfg, lines, zip) {
  try {
    const data = await cj(env, 'POST', '/logistic/freightCalculate', {
      body: { startCountryCode: 'CN', endCountryCode: 'IN', zip: zip || undefined, products: lines.map((l) => ({ quantity: l.quantity, vid: l.vid })) },
    });
    const opts = (Array.isArray(data) ? data : []).map((o) => ({
      name: o.logisticName, usd: num(o.logisticPrice ?? o.logisticAggregatePrice), days: o.logisticAging || '',
    })).filter((o) => o.name && o.usd > 0).sort((a, b) => a.usd - b.usd);
    if (!opts.length) return null;
    return { name: opts[0].name, inr: Math.ceil(opts[0].usd * cfg.fx * (1 + cfg.fxBufferPct / 100)), days: opts[0].days };
  } catch { return null; }
}

export const cleanText = (h, n) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
