-- ELYVORA account identity and privacy v3
CREATE TABLE IF NOT EXISTS account_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  interests_json TEXT NOT NULL DEFAULT '[]',
  email_verified_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_privacy (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public','followers','private')),
  content_visibility TEXT NOT NULL DEFAULT 'public' CHECK (content_visibility IN ('public','followers','private')),
  message_privacy TEXT NOT NULL DEFAULT 'everyone' CHECK (message_privacy IN ('everyone','followers','none')),
  comment_privacy TEXT NOT NULL DEFAULT 'everyone' CHECK (comment_privacy IN ('everyone','followers','none')),
  show_online INTEGER NOT NULL DEFAULT 1 CHECK (show_online IN (0,1)),
  read_receipts INTEGER NOT NULL DEFAULT 1 CHECK (read_receipts IN (0,1)),
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id,blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id,purpose,created_at DESC);
INSERT OR IGNORE INTO account_profiles(user_id,country,city,interests_json,updated_at)
  SELECT id,'','', '[]', updated_at FROM users;
INSERT OR IGNORE INTO user_privacy(user_id,updated_at)
  SELECT id,updated_at FROM users;
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES (3,unixepoch());
