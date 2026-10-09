CREATE TABLE IF NOT EXISTS runtime_logs (
 id TEXT PRIMARY KEY, created_at TEXT NOT NULL, level TEXT NOT NULL,
 source TEXT NOT NULL, event TEXT NOT NULL, path TEXT NOT NULL,
 request_id TEXT NOT NULL, status INTEGER, duration_ms INTEGER, message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_logs_date ON runtime_logs(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS runtime_logs_trace ON runtime_logs(request_id);
