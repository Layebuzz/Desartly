CREATE TABLE IF NOT EXISTS booking_owner_emails (
 booking_id TEXT PRIMARY KEY REFERENCES calendar_bookings(id),
 status TEXT NOT NULL CHECK(status IN ('pending','sending','sent','uncertain','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL DEFAULT 0,
 message_id TEXT
);
