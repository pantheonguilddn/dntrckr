import { repairBootstrapAdminOwnerLinks } from './registration-guard.js';

const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const arr = value => Array.isArray(value) ? value : [];

export function characterKey(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
}
export function taskKey(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
}


// Provision the additive player-storage tables automatically on the first authenticated
// administrator startup. This keeps deployment to one Pages ZIP: no separate D1 console
// step is required. Every statement is idempotent and leaves the existing Tracker untouched.
export async function ensureCharacterStorageSchema(env) {
  const db = env?.PANTHEON_DB;
  if (!db) throw new Error('The Pantheon D1 binding is unavailable.');
  const ddl = [
    `CREATE TABLE IF NOT EXISTS character_owners (character_key TEXT PRIMARY KEY, character_name TEXT NOT NULL, member_id TEXT NOT NULL DEFAULT '', owner_name TEXT NOT NULL DEFAULT '', owner_discord_id TEXT NOT NULL DEFAULT '', tracker_enabled INTEGER NOT NULL DEFAULT 0 CHECK (tracker_enabled IN (0,1)), active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), updated_at INTEGER NOT NULL DEFAULT 0)`,
    `CREATE INDEX IF NOT EXISTS idx_character_owners_discord ON character_owners(owner_discord_id, active)`,
    `CREATE INDEX IF NOT EXISTS idx_character_owners_member ON character_owners(member_id, active)`,
    `CREATE TABLE IF NOT EXISTS tracker_task_definitions (task_key TEXT PRIMARY KEY, task_name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), updated_at INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS character_task_cells (character_key TEXT NOT NULL, task_key TEXT NOT NULL, task_name TEXT NOT NULL DEFAULT '', state TEXT NOT NULL CHECK (state IN ('open','done','excluded','marked','reset')), note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, device_id TEXT NOT NULL DEFAULT '', PRIMARY KEY (character_key, task_key))`,
    `CREATE INDEX IF NOT EXISTS idx_character_task_cells_updated ON character_task_cells(updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS character_completion_timing (character_key TEXT NOT NULL, week_key TEXT NOT NULL, task_key TEXT NOT NULL, task_name TEXT NOT NULL DEFAULT '', state TEXT NOT NULL CHECK (state IN ('open','done')), at INTEGER NOT NULL, owner_key TEXT NOT NULL DEFAULT '', PRIMARY KEY (character_key, week_key, task_key))`,
    `CREATE INDEX IF NOT EXISTS idx_character_timing_week ON character_completion_timing(week_key)`,
    `CREATE INDEX IF NOT EXISTS idx_character_timing_character_at ON character_completion_timing(character_key, at)`,
    `CREATE INDEX IF NOT EXISTS idx_character_timing_at ON character_completion_timing(at)`,
    `CREATE TABLE IF NOT EXISTS tracker_storage_changes (change_type TEXT NOT NULL CHECK (change_type IN ('cell','timing','full','feed')), character_key TEXT NOT NULL DEFAULT '', task_key TEXT NOT NULL DEFAULT '', week_key TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL, PRIMARY KEY (change_type, character_key, task_key, week_key))`,
    `CREATE INDEX IF NOT EXISTS idx_tracker_storage_changes_type_revision ON tracker_storage_changes(change_type, revision)`,
    `CREATE TABLE IF NOT EXISTS tracker_storage_meta (id INTEGER PRIMARY KEY CHECK (id = 1), migration_complete INTEGER NOT NULL DEFAULT 0 CHECK (migration_complete IN (0,1)), migration_in_progress INTEGER NOT NULL DEFAULT 0 CHECK (migration_in_progress IN (0,1)), migration_lock_until INTEGER NOT NULL DEFAULT 0, migration_lock_token TEXT NOT NULL DEFAULT '', schema_version INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, migration_at INTEGER NOT NULL DEFAULT 0, directory_signature TEXT NOT NULL DEFAULT '', analytics_tracking_enabled INTEGER NOT NULL DEFAULT 0 CHECK (analytics_tracking_enabled IN (0,1)), analytics_history_cleared_at INTEGER NOT NULL DEFAULT 0)`,
    `INSERT OR IGNORE INTO tracker_storage_meta (id, migration_complete, migration_in_progress, migration_lock_until, schema_version, revision, updated_at, migration_at) VALUES (1,0,0,0,1,0,0,0)`,
    `INSERT OR IGNORE INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision) SELECT 'full', '', '', '', revision FROM tracker_storage_meta WHERE id = 1`,
    `INSERT OR IGNORE INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision) SELECT 'feed', '', '', '', revision FROM tracker_storage_meta WHERE id = 1`,
    `CREATE TABLE IF NOT EXISTS tracker_legacy_backups (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', record_json TEXT NOT NULL, source_updated_at INTEGER NOT NULL DEFAULT 0, backed_up_at INTEGER NOT NULL)`
  ];
  await db.batch(ddl.map(sql => db.prepare(sql)));
  return true;
}

export async function getCharacterStorageState(env) {
  return await env.PANTHEON_DB.prepare(
    'SELECT migration_complete, migration_in_progress, migration_lock_until, schema_version, revision, updated_at, migration_at, analytics_tracking_enabled, analytics_history_cleared_at FROM tracker_storage_meta WHERE id = 1 LIMIT 1'
  ).first();
}

export async function isCharacterStorageMigrationBusy(env) {
  try {
    const state = await getCharacterStorageState(env);
    return Number(state?.migration_in_progress) === 1 && Number(state?.migration_lock_until) > Date.now();
  } catch (_) {
    // Before the additive character-storage schema is installed, legacy writes remain available.
    return false;
  }
}

export function buildCharacterIndex(record) {
  const settings = obj(record?.settings);
  const members = arr(settings.memberDirectory);
  const rosterNames = new Map();
  for (const roster of arr(settings.rosters)) {
    for (const name of arr(roster?.characters)) rosterNames.set(characterKey(name), true);
  }

  const charOwners = new Map();
  const ownerMembers = new Map();
  const duplicateCharacters = [];
  for (const member of members) {
    const memberId = String(member?.id || member?.name || '').trim().slice(0, 120);
    const ownerName = String(member?.name || '').trim().slice(0, 60);
    const discordId = String(member?.profileConfirmedDiscordId || '').trim().slice(0, 80);
    if (!memberId || !ownerName) continue;
    if (discordId) {
      if (!ownerMembers.has(discordId)) ownerMembers.set(discordId, new Set());
      ownerMembers.get(discordId).add(memberId);
    }
    const names = new Set([
      ...arr(member?.characters).map(value => typeof value === 'object' ? (value?.name || value?.ign || '') : value),
      ...arr(member?.characterProfiles).map(profile => profile?.name || profile?.ign || '')
    ].map(value => String(value || '').trim().slice(0, 40)).filter(Boolean));
    const profiles = new Map(arr(member?.characterProfiles).map(profile => [characterKey(profile?.name || profile?.ign), profile]));
    for (const name of names) {
      const key = characterKey(name);
      if (!key) continue;
      const profile = profiles.get(key) || {};
      const row = {
        characterKey: key,
        characterName: name,
        memberId,
        ownerName,
        ownerDiscordId: discordId,
        trackerEnabled: profile.trackerEnabled === true || rosterNames.has(key) ? 1 : 0,
        active: 1
      };
      const existing = charOwners.get(key);
      if (existing && existing.memberId !== memberId) {
        duplicateCharacters.push(name);
        existing.ownerDiscordId = '';
        existing.active = 0;
      } else if (!existing) charOwners.set(key, row);
    }
  }

  // One confirmed Discord identity must resolve to one Member Roster owner.
  // Ambiguous legacy links are deliberately disabled until an administrator resolves them.
  const conflictedDiscordIds = new Set([...ownerMembers.entries()].filter(([, ids]) => ids.size > 1).map(([id]) => id));
  const unlinkedCharacters = [];
  for (const row of charOwners.values()) {
    if (row.ownerDiscordId && conflictedDiscordIds.has(row.ownerDiscordId)) row.ownerDiscordId = '';
    if (!row.ownerDiscordId) unlinkedCharacters.push(row.characterName);
  }

  const tasks = new Map();
  for (const category of arr(settings.categories)) {
    for (const rawName of arr(category?.tasks)) {
      const name = String(rawName || '').trim().slice(0, 140);
      const key = taskKey(name);
      if (name && key) tasks.set(key, name);
    }
  }
  return { characters: [...charOwners.values()], tasks: [...tasks.entries()].map(([key, name]) => ({ taskKey: key, taskName: name })), duplicateCharacters: [...new Set(duplicateCharacters)], unlinkedCharacters: [...new Set(unlinkedCharacters)] };
}

export async function syncCharacterIndexes(env, record, now = Date.now(), force = false) {
  const { characters, tasks, duplicateCharacters, unlinkedCharacters } = buildCharacterIndex(record);
  const directorySignature = JSON.stringify({
    characters: characters.map(item => [item.characterKey,item.characterName,item.memberId,item.ownerName,item.ownerDiscordId,item.trackerEnabled,item.active]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
    tasks: tasks.map(item => [item.taskKey,item.taskName]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
  });
  const meta = await env.PANTHEON_DB.prepare('SELECT directory_signature FROM tracker_storage_meta WHERE id = 1 LIMIT 1').first();
  if (!force && String(meta?.directory_signature || '') === directorySignature) {
    return { characterCount: characters.length, taskCount: tasks.length, duplicateCharacters, unlinkedCharacters, unchanged:true };
  }

  // Upsert current rows first and retire removed rows last. This avoids temporarily
  // disabling every member's character/task index during a roster refresh.
  const [existingCharacters, existingTasks] = await Promise.all([
    env.PANTHEON_DB.prepare('SELECT character_key FROM character_owners').all(),
    env.PANTHEON_DB.prepare('SELECT task_key FROM tracker_task_definitions').all()
  ]);
  const activeCharacterKeys = new Set(characters.filter(item => item.active === 1).map(item => item.characterKey));
  const activeTaskKeys = new Set(tasks.map(item => item.taskKey));
  const statements = [];
  for (const item of characters) {
    statements.push(env.PANTHEON_DB.prepare(`
      INSERT INTO character_owners (character_key, character_name, member_id, owner_name, owner_discord_id, tracker_enabled, active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_key) DO UPDATE SET
        character_name = excluded.character_name,
        member_id = excluded.member_id,
        owner_name = excluded.owner_name,
        owner_discord_id = excluded.owner_discord_id,
        tracker_enabled = excluded.tracker_enabled,
        active = excluded.active,
        updated_at = excluded.updated_at
    `).bind(item.characterKey, item.characterName, item.memberId, item.ownerName, item.ownerDiscordId, item.trackerEnabled, item.active === 1 ? 1 : 0, now));
  }
  for (const item of tasks) {
    statements.push(env.PANTHEON_DB.prepare(`
      INSERT INTO tracker_task_definitions (task_key, task_name, active, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(task_key) DO UPDATE SET task_name = excluded.task_name, active = 1, updated_at = excluded.updated_at
    `).bind(item.taskKey, item.taskName, now));
  }
  for (const row of existingCharacters.results || []) {
    const key = String(row.character_key || '');
    if (key && !activeCharacterKeys.has(key)) statements.push(env.PANTHEON_DB.prepare('UPDATE character_owners SET active = 0, updated_at = ? WHERE character_key = ?').bind(now, key));
  }
  for (const row of existingTasks.results || []) {
    const key = String(row.task_key || '');
    if (key && !activeTaskKeys.has(key)) statements.push(env.PANTHEON_DB.prepare('UPDATE tracker_task_definitions SET active = 0, updated_at = ? WHERE task_key = ?').bind(now, key));
  }
  statements.push(env.PANTHEON_DB.prepare('UPDATE tracker_storage_meta SET directory_signature = ? WHERE id = 1').bind(directorySignature));
  // Keep batch sizes well below D1's statement ceiling for larger guild rosters.
  for (let offset = 0; offset < statements.length; offset += 80) {
    await env.PANTHEON_DB.batch(statements.slice(offset, offset + 80));
  }
  return { characterCount: characters.length, taskCount: tasks.length, duplicateCharacters, unlinkedCharacters };
}

export async function hydrateCharacterProgress(env, record) {
  let state;
  try { state = await getCharacterStorageState(env); } catch (_) { return record; }
  if (Number(state?.migration_complete) !== 1) return record;
  Object.defineProperty(record, '__pantheonCharacterStorageUpdatedAt', {
    value: Number(state?.updated_at) || 0, configurable: true, enumerable: false
  });
  Object.defineProperty(record, '__pantheonCharacterStorageRevision', {
    value: Number(state?.revision) || 0, configurable: true, enumerable: false
  });
  const cellRows = await env.PANTHEON_DB.prepare(`
    SELECT o.character_name, c.task_key, c.task_name, c.state, c.note, c.updated_at, c.device_id, t.task_name AS definition_name
    FROM character_task_cells c
    JOIN character_owners o ON o.character_key = c.character_key
    LEFT JOIN tracker_task_definitions t ON t.task_key = c.task_key
    ORDER BY o.character_name, COALESCE(NULLIF(c.task_name, ''), t.task_name, c.task_key)
  `).all();
  const cells = {};
  for (const row of cellRows.results || []) {
    const name = String(row.character_name || '').trim();
    const taskName = String(row.task_name || row.definition_name || row.task_key || '').trim();
    if (!name || !taskName) continue;
    if (!cells[name]) cells[name] = {};
    cells[name][taskName] = {
      state: String(row.state || 'open'), note: String(row.note || ''),
      updatedAt: Number(row.updated_at) || 0, deviceId: String(row.device_id || '')
    };
  }
  const completionTiming = {};
  const cutoff = Date.now() - 42 * 24 * 60 * 60 * 1000;
  const clearedAt = Math.max(Number(record?.settings?.analyticsHistoryClearedAt) || 0, Number(state?.analytics_history_cleared_at) || 0);
  const timingRows = await env.PANTHEON_DB.prepare(`
    SELECT o.character_name, t.week_key, t.task_key, t.task_name, t.state, t.at, t.owner_key, d.task_name AS definition_name
    FROM character_completion_timing t
    JOIN character_owners o ON o.character_key = t.character_key
    LEFT JOIN tracker_task_definitions d ON d.task_key = t.task_key
    WHERE t.at >= ? AND t.at >= ?
    ORDER BY t.week_key, o.character_name
  `).bind(cutoff, clearedAt).all();
  for (const row of timingRows.results || []) {
    const characterName = String(row.character_name || '').trim();
    const taskName = String(row.task_name || row.definition_name || row.task_key || '').trim();
    const weekKey = String(row.week_key || '');
    if (!characterName || !taskName || !weekKey || Number(row.at) < cutoff || Number(row.at) < clearedAt) continue;
    if (!completionTiming[weekKey]) completionTiming[weekKey] = {};
    if (!completionTiming[weekKey][characterName]) completionTiming[weekKey][characterName] = {};
    completionTiming[weekKey][characterName][taskName] = { state: row.state === 'done' ? 'done' : 'open', at: Number(row.at) || 0, ownerKey: String(row.owner_key || '') };
  }
  record.cells = cells;
  record.completionTiming = completionTiming;
  return record;
}

export async function syncCharacterStorageSettings(env, record, now = Date.now()) {
  const settings = obj(record?.settings);
  await env.PANTHEON_DB.prepare(`
    UPDATE tracker_storage_meta
    SET analytics_tracking_enabled = ?,
        analytics_history_cleared_at = CASE WHEN ? > analytics_history_cleared_at THEN ? ELSE analytics_history_cleared_at END
    WHERE id = 1
  `).bind(settings.analyticsTrackingEnabled === true ? 1 : 0, Number(settings.analyticsHistoryClearedAt) || 0, Number(settings.analyticsHistoryClearedAt) || 0).run();
}

export async function bumpCharacterStorageRevision(env, at = Date.now()) {
  // Ownership/index changes affect the labels or visibility of the aggregate view,
  // so they intentionally invalidate the next incremental poll into a full snapshot.
  await env.PANTHEON_DB.batch([
    env.PANTHEON_DB.prepare(`
      UPDATE tracker_storage_meta
      SET revision = revision + 1, updated_at = CASE WHEN ? > updated_at THEN ? ELSE updated_at + 1 END
      WHERE id = 1
    `).bind(at, at),
    env.PANTHEON_DB.prepare(`
      INSERT INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision)
      SELECT 'full', '', '', '', revision FROM tracker_storage_meta WHERE id = 1
      ON CONFLICT(change_type, character_key, task_key, week_key) DO UPDATE SET revision = excluded.revision
    `),
    env.PANTHEON_DB.prepare(`
      INSERT INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision)
      SELECT 'feed', '', '', '', revision FROM tracker_storage_meta WHERE id = 1
      ON CONFLICT(change_type, character_key, task_key, week_key) DO UPDATE SET revision = excluded.revision
    `)
  ]);
}
