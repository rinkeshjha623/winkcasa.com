CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT NOT NULL UNIQUE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  subtotal_paise INTEGER NOT NULL,
  shipping_paise INTEGER NOT NULL,
  total_paise INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  items_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
