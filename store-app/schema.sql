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

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General',
  price INTEGER NOT NULL, mrp INTEGER, description TEXT NOT NULL DEFAULT '', tag TEXT,
  images_json TEXT NOT NULL DEFAULT '[]', stock INTEGER, active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0, supplier TEXT, cost INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));

-- Customer accounts (see migrations/005_accounts.sql)
CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT, pass_hash TEXT NOT NULL, pass_salt TEXT NOT NULL, fails INTEGER NOT NULL DEFAULT 0, locked_until TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, customer_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, label TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, pincode TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS wishlist (customer_id INTEGER NOT NULL, product_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (customer_id, product_id));
