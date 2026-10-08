CREATE TABLE IF NOT EXISTS mailbox_messages (
 id TEXT PRIMARY KEY, provider_id TEXT UNIQUE, direction TEXT NOT NULL,
 folder TEXT NOT NULL, sender TEXT NOT NULL, recipient TEXT NOT NULL,
 subject TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL,
 unread INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'stored'
);
CREATE INDEX IF NOT EXISTS mailbox_folder_date ON mailbox_messages(folder,created_at);
