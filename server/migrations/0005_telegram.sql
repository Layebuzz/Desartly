CREATE TABLE IF NOT EXISTS telegram_settings (id INTEGER PRIMARY KEY CHECK(id=1), owner_id TEXT, owner_name TEXT, candidate_id TEXT, candidate_name TEXT, pair_code TEXT, pair_expires INTEGER, bot_name TEXT, updated_at INTEGER);
INSERT OR IGNORE INTO telegram_settings(id) VALUES(1);
CREATE TABLE IF NOT EXISTS telegram_updates (update_id INTEGER PRIMARY KEY, status TEXT NOT NULL, created_at INTEGER NOT NULL);
