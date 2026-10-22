CREATE TABLE IF NOT EXISTS selfies (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, face_shape TEXT, image TEXT NOT NULL, ip_hash TEXT, consent_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_selfies_customer ON selfies(customer_id);
CREATE INDEX IF NOT EXISTS idx_selfies_created ON selfies(created_at);
