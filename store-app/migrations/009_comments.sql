CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, name TEXT NOT NULL, email TEXT, body TEXT NOT NULL, reply TEXT, status TEXT NOT NULL DEFAULT 'pending', ip_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, status);
