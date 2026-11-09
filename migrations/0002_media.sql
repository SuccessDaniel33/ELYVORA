-- ELYVORA media storage v2
-- This bounded D1 storage path supports small images, short video clips and voice notes.
-- Move these objects to R2 when the account subscription is enabled.
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  byte_length INTEGER NOT NULL,
  data_b64 TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_id,created_at DESC);
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES (2,unixepoch());
