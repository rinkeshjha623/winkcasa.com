ALTER TABLE orders ADD COLUMN fulfilment_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE orders ADD COLUMN supplier_name TEXT;
ALTER TABLE orders ADD COLUMN supplier_order_ref TEXT;
ALTER TABLE orders ADD COLUMN supplier_cost_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN courier TEXT;
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN shipped_at TEXT;
ALTER TABLE orders ADD COLUMN delivered_at TEXT;
ALTER TABLE orders ADD COLUMN refund_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE orders ADD COLUMN refunded_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN notes TEXT;
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT NOT NULL,
  text TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_ref ON order_events(order_ref);
