CREATE TABLE IF NOT EXISTS calendar_bookings (
 id TEXT PRIMARY KEY,
 calendar_id TEXT NOT NULL,
 start_at INTEGER NOT NULL,
 end_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled')),
 expires_at INTEGER NOT NULL,
 signature TEXT NOT NULL,
 brief TEXT NOT NULL,
 confirmation TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS calendar_bookings_times ON calendar_bookings(start_at,end_at,status);
