ALTER TABLE telegram_settings ADD COLUMN notifications INTEGER NOT NULL DEFAULT 1;
ALTER TABLE telegram_settings ADD COLUMN reminders INTEGER NOT NULL DEFAULT 1;
ALTER TABLE telegram_settings ADD COLUMN reminder_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE telegram_settings ADD COLUMN notifications_since INTEGER NOT NULL DEFAULT 0;
CREATE TABLE telegram_exports (
 project_id TEXT NOT NULL, format TEXT NOT NULL, version TEXT NOT NULL,
 storage_key TEXT NOT NULL, byte_size INTEGER NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(project_id,format)
);
CREATE TABLE telegram_actions (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL,
 payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE telegram_deliveries (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, booking_id TEXT, version TEXT,
 status TEXT NOT NULL DEFAULT 'pending', payload TEXT, message_id TEXT,
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE telegram_client_notes (
 booking_id TEXT PRIMARY KEY, note TEXT NOT NULL DEFAULT '', outcome TEXT,
 follow_up_at INTEGER, updated_at INTEGER NOT NULL
);
CREATE TABLE calendar_operation_locks (id TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE calendar_schedule (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
CREATE INDEX telegram_delivery_pending ON telegram_deliveries(status,next_attempt);
