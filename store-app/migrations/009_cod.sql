-- Cash on delivery with a small online advance (see functions/api/checkout.js).
ALTER TABLE orders ADD COLUMN pay_mode TEXT NOT NULL DEFAULT 'online';
ALTER TABLE orders ADD COLUMN cod_fee_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN cod_advance_paise INTEGER NOT NULL DEFAULT 0;
