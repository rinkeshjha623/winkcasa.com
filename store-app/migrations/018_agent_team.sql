CREATE TABLE IF NOT EXISTS intel (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, source TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE, published TEXT, seen_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_intel_seen ON intel (seen_at);
CREATE TABLE IF NOT EXISTS keyword_metrics (kw TEXT PRIMARY KEY, volume INTEGER, competition TEXT, impressions INTEGER, position REAL, source TEXT NOT NULL DEFAULT 'planner', at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS topic_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, kw TEXT NOT NULL, why TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')));
