CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  label TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
  city TEXT NOT NULL, state TEXT NOT NULL, pincode TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);
CREATE TABLE IF NOT EXISTS wishlist (
  customer_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, product_id)
);
ALTER TABLE orders ADD COLUMN customer_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
