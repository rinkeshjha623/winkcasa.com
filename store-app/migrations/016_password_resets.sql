CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, customer_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
