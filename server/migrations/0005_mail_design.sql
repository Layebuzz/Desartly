ALTER TABLE mailbox_messages ADD COLUMN template TEXT NOT NULL DEFAULT 'letter';
ALTER TABLE mailbox_messages ADD COLUMN template_data TEXT NOT NULL DEFAULT '{}';
ALTER TABLE mailbox_messages ADD COLUMN cc TEXT NOT NULL DEFAULT '[]';
ALTER TABLE mailbox_messages ADD COLUMN bcc TEXT NOT NULL DEFAULT '[]';
ALTER TABLE mailbox_messages ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS mailbox_starred_date ON mailbox_messages(starred, created_at DESC);
