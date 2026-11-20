# WinkCasa – instructions for coding agents

Online jewellery/hair-accessory store (www.winkcasa.com). App root: `store-app`.
Stack: Cloudflare Pages + Functions (SSR), D1 (SQLite), Razorpay payments, CJ Dropshipping.

## Always
- Work test-first (TDD). Run tests with `cd store-app && sh tests/run.sh` (Node 22, no install needed). All tests must pass before you finish.
- Never commit secrets (.env, API keys, tokens). Secrets live in Cloudflare/GitHub settings only.
- Do not change prices, orders, coupons or customer data directly; change code and tests.

## Code layout (store-app)
- `functions/` – API and page handlers (`functions/api/*`, `functions/p/[slug].js`).
- `src/` – shared logic: `seo.js` (layout, structured data), `admin.js` (admin auth, stock), `guard.js` (rate limits, cron auth), `coupons.js`, `reviews.js`.
- `public/` – static files; `site.css` / `site.js` are shared. Bump the `?v=` cache-buster when they change.
- `migrations/` + `schema.sql` – D1 schema; add a new numbered migration for any change.
- `tests/` – unit and integration tests (in-memory D1 shim in `tests/helpers/d1.mjs`).

## Rules that matter
- Ratings and reviews must be real: computed only from approved reviews, never invented or set by hand.
- Admin endpoints must call `await requireAdmin(request, env)`.
- Public write endpoints must use `rateLimit()` from `src/guard.js`.
- Cron endpoints must use `cronGuard()`; workflows send `CRON_SECRET`.
- UI changes must work on desktop and 390px mobile, in light and dark mode.
