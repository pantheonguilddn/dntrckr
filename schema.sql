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

-- Owner-scoped character progress. Legacy data_records are retained as the migration/recovery source.
CREATE TABLE IF NOT EXISTS character_owners (
  character_key TEXT PRIMARY KEY,
  character_name TEXT NOT NULL,
  member_id TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  owner_discord_id TEXT NOT NULL DEFAULT '',
  tracker_enabled INTEGER NOT NULL DEFAULT 0 CHECK (tracker_enabled IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_character_owners_discord ON character_owners(owner_discord_id, active);
CREATE INDEX IF NOT EXISTS idx_character_owners_member ON character_owners(member_id, active);

CREATE TABLE IF NOT EXISTS tracker_task_definitions (
  task_key TEXT PRIMARY KEY,
  task_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS character_task_cells (
  character_key TEXT NOT NULL,
  task_key TEXT NOT NULL,
  task_name TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL CHECK (state IN ('open', 'done', 'excluded', 'marked', 'reset')),
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (character_key, task_key)
);
CREATE INDEX IF NOT EXISTS idx_character_task_cells_updated ON character_task_cells(updated_at DESC);

CREATE TABLE IF NOT EXISTS character_completion_timing (
  character_key TEXT NOT NULL,
  week_key TEXT NOT NULL,
  task_key TEXT NOT NULL,
  task_name TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL CHECK (state IN ('open', 'done')),
  at INTEGER NOT NULL,
  owner_key TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (character_key, week_key, task_key)
);
CREATE INDEX IF NOT EXISTS idx_character_timing_week ON character_completion_timing(week_key);
CREATE INDEX IF NOT EXISTS idx_character_timing_character_at ON character_completion_timing(character_key, at);

CREATE TABLE IF NOT EXISTS tracker_storage_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  migration_complete INTEGER NOT NULL DEFAULT 0 CHECK (migration_complete IN (0, 1)),
  migration_in_progress INTEGER NOT NULL DEFAULT 0 CHECK (migration_in_progress IN (0, 1)),
  migration_lock_until INTEGER NOT NULL DEFAULT 0,
  migration_lock_token TEXT NOT NULL DEFAULT '',
  schema_version INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  migration_at INTEGER NOT NULL DEFAULT 0,
  directory_signature TEXT NOT NULL DEFAULT '',
  analytics_tracking_enabled INTEGER NOT NULL DEFAULT 0 CHECK (analytics_tracking_enabled IN (0, 1)),
  analytics_history_cleared_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO tracker_storage_meta (id, migration_complete, migration_in_progress, migration_lock_until, schema_version, revision, updated_at, migration_at)
VALUES (1, 0, 0, 0, 1, 0, 0, 0);

CREATE TABLE IF NOT EXISTS tracker_legacy_backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  record_json TEXT NOT NULL,
  source_updated_at INTEGER NOT NULL DEFAULT 0,
  backed_up_at INTEGER NOT NULL
);


-- Private one-to-one guild messages. The API also creates this table lazily so no manual migration is required.
CREATE TABLE IF NOT EXISTS guild_messages (
  id TEXT PRIMARY KEY,
  conversation_key TEXT NOT NULL,
  sender_discord_id TEXT NOT NULL,
  recipient_discord_id TEXT NOT NULL,
  sender_member_id TEXT NOT NULL,
  recipient_member_id TEXT NOT NULL,
  body TEXT NOT NULL,
  reply_to TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  read_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_guild_messages_conversation ON guild_messages(conversation_key, created_at);
CREATE INDEX IF NOT EXISTS idx_guild_messages_recipient_unread ON guild_messages(recipient_discord_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS idx_guild_messages_sender ON guild_messages(sender_discord_id, created_at);
