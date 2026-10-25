CREATE TABLE IF NOT EXISTS allowed_users (
  discord_id TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(discord_id);

CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS data_records (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  record_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS record_aliases (
  alias_id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_discord_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_discord_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at DESC);


-- Live tool presence; stale rows are ignored by the API and pruned during heartbeat.
CREATE TABLE IF NOT EXISTS user_presence (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_presence_seen ON user_presence(last_seen_at);
