# WinkCasa store

Your own store: a static storefront (`public/`), a checkout backend (`functions/api/`) that runs on Cloudflare Pages, Razorpay for payments, and a Cloudflare D1 database for orders.

| Path | What it does |
|---|---|
| `public/index.html` | The storefront, cart and checkout form |
| `public/products.json` | Your catalogue and delivery rules. Edit prices and products here |
| `functions/api/checkout.js` | Prices the cart on the server, creates the Razorpay order, saves the order |
| `functions/api/verify.js` | Checks the payment signature and marks the order paid |
| `functions/api/webhook.js` | Razorpay webhook, marks orders paid even if the customer closes the tab |
| `functions/api/admin/orders.js` | Your order list (JSON), protected by `ADMIN_TOKEN` |
| `schema.sql` | Orders table (already created in the `winkcasa` D1 database) |

## Go live

1. **Cloudflare > Workers & Pages > Create > Pages > Connect to Git.** Pick this repo and the branch you want to publish.
   - Root directory: `store-app`
   - Build command: none
   - Build output directory: `public`
2. **Bind the database.** Pages project > Settings > Bindings > Add > D1 database. Variable name `DB`, database `winkcasa`.
3. **Add secrets.** Settings > Variables and Secrets (Production):
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from Razorpay Dashboard > Account & Settings > API Keys. Use **test** keys first.
   - `RAZORPAY_WEBHOOK_SECRET`: any long random string. Use the same one in step 5.
   - `ADMIN_TOKEN`: any long random string, used to read your orders.
4. **Add the domain.** Pages project > Custom domains > `www.winkcasa.com`.
5. **Razorpay webhook.** Dashboard > Webhooks > Add: URL `https://www.winkcasa.com/api/webhook`, event `payment.captured`, secret from step 3.
6. **Test** with Razorpay test keys and its test card, then switch to live keys.

## See your orders

```
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://www.winkcasa.com/api/admin/orders?status=paid
```

Each order lists the customer, address, items and amount. Place the matching order with your supplier, then ship to that address.

## Before you take real orders

Fill in `public/business.json` (legal name, GSTIN, address, email, phone, grievance officer). It appears on the policy pages and contact page. Review the policy pages in `public/` (returns, shipping, privacy, terms, contact), especially the 7-day return window and delivery times, and have them checked by a lawyer if you can. Prices in `products.json` are placeholders until you have supplier quotes.
