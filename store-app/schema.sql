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
  paid_at TEXT,
  fulfilment_status TEXT NOT NULL DEFAULT 'new',
  supplier_name TEXT,
  supplier_order_ref TEXT,
  supplier_cost_paise INTEGER NOT NULL DEFAULT 0,
  courier TEXT,
  tracking_number TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  refund_status TEXT NOT NULL DEFAULT 'none',
  refunded_paise INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT NOT NULL,
  text TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_ref ON order_events(order_ref);
