import { jsonResponse, requireAdmin } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';
import { repairBootstrapAdminOwnerLinks } from '../../_utils/registration-guard.js';
import { buildCharacterIndex, characterKey, ensureCharacterStorageSchema, getCharacterStorageState, syncCharacterIndexes, syncCharacterStorageSettings, taskKey } from '../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const LOCK_TTL_MS = 30 * 60 * 1000;
const TIMING_IMPORT_DAYS = 90;
const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

async function getMain(env) {
  const row = await env.PANTHEON_DB.prepare('SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(MAIN_ID).first();
  if (!row) return null;
  let record;
  try { record = decodePantheonCompactRecord(JSON.parse(row.record_json)); }
  catch (_) { throw new Error('The existing shared Tracker record is corrupt; no migration was performed.'); }
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('The existing shared Tracker record has an invalid structure.');
  return { row, record };
}

async function getStatus(env) {
  const state = await getCharacterStorageState(env);
  const counts = await env.PANTHEON_DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM character_owners WHERE active = 1) AS character_count,
      (SELECT COUNT(*) FROM character_task_cells) AS cell_count,
      (SELECT COUNT(*) FROM character_completion_timing) AS timing_count,
      (SELECT COUNT(*) FROM character_owners WHERE active = 1 AND owner_discord_id = '') AS unlinked_count
  `).first();
  return {
    migrationComplete: Number(state?.migration_complete) === 1,
    migrationInProgress: Number(state?.migration_in_progress) === 1 && Number(state?.migration_lock_until) > Date.now(),
    schemaVersion: Number(state?.schema_version) || 1,
    revision: Number(state?.revision) || 0,
    updatedAt: Number(state?.updated_at) || 0,
    migrationAt: Number(state?.migration_at) || 0,
    characterCount: Number(counts?.character_count) || 0,
    cellCount: Number(counts?.cell_count) || 0,
    timingCount: Number(counts?.timing_count) || 0,
    unlinkedCharacterCount: Number(counts?.unlinked_count) || 0
  };
}

async function renewMigrationLock(env, lockToken) {
  const now = Date.now();
  const renewed = await env.PANTHEON_DB.prepare(`
    UPDATE tracker_storage_meta
    SET migration_lock_until = ?
    WHERE id = 1 AND migration_complete = 0 AND migration_in_progress = 1 AND migration_lock_token = ?
  `).bind(now + LOCK_TTL_MS, lockToken).run();
  if (Number(renewed?.meta?.changes) !== 1) throw new Error('The player-storage migration lock was lost. The legacy Tracker remains available; check migration status before retrying.');
}

function preferCell(candidate, existing) {
  if (!existing) return true;
  if (candidate.updatedAt !== existing.updatedAt) return candidate.updatedAt > existing.updatedAt;
  return candidate.deviceId.localeCompare(existing.deviceId) > 0;
}

function preferTiming(candidate, existing) {
  if (!existing) return true;
  if (candidate.at !== existing.at) return candidate.at > existing.at;
  return candidate.ownerKey.localeCompare(existing.ownerKey) > 0;
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    await ensureCharacterStorageSchema(context.env);
    const status = await getStatus(context.env);
    if (status.migrationComplete) return jsonResponse({ ok:true, migratedNow:false, ...status });
    // The first administrator to open the updated app automatically provisions and migrates
    // player storage. Admin View does not need to be enabled: this is a one-time data setup,
    // not a grant of cross-player editing permission.
    return await performCharacterStorageMigration(context);
  } catch (error) {
    return jsonResponse({ error:`Player storage could not be initialized automatically. The original Tracker remains available. ${String(error?.message || error).slice(0, 240)}` }, 503);
  }
}

async function performCharacterStorageMigration(context) {
  const { env } = context;
  const actor = String(context.data?.session?.discordId || '');
  const lockToken = crypto.randomUUID();
  let lockAcquired = false;
  let migrationCompleted = false;

  try {
    const now = Date.now();
    // A token, not just a boolean lease, prevents an expired worker from releasing a newer
    // administrator's lock in its finally block. The lease is renewed before each batch.
    const lock = await env.PANTHEON_DB.prepare(`
      UPDATE tracker_storage_meta
      SET migration_in_progress = 1, migration_lock_until = ?, migration_lock_token = ?,
          updated_at = CASE WHEN ? > updated_at THEN ? ELSE updated_at + 1 END
      WHERE id = 1 AND migration_complete = 0
        AND (migration_in_progress = 0 OR migration_lock_until < ?)
    `).bind(now + LOCK_TTL_MS, lockToken, now, now, now).run();
    lockAcquired = Number(lock?.meta?.changes) > 0;
    if (!lockAcquired) {
      const currentStatus = await getStatus(env);
      if (currentStatus.migrationComplete) return jsonResponse({ ok:true, alreadyMigrated:true, ...currentStatus });
      return jsonResponse({ code:'CHARACTER_STORAGE_MIGRATION_BUSY', retryable:true, error:'Another player-storage migration is already running. Do not start a second migration; wait for the current operation or let its migration lease expire.' }, 409);
    }

    const source = await getMain(env);
    if (!source) return jsonResponse({ error:'The shared Pantheon Tracker has not been initialized.' }, 404);

    // The bootstrap administrator has one personal roster (Cho). Admin is a permission
    // mode, not a second roster owner. Resolve this before building the owner index.
    const bootstrapOwnerRepaired = repairBootstrapAdminOwnerLinks(source.record, context.data.session);
    const index = buildCharacterIndex(source.record);
    if (index.duplicateCharacters.length) {
      return jsonResponse({ error:'Migration stopped because one or more character IGNs are assigned to multiple Member Roster entries.', duplicateCharacters:index.duplicateCharacters }, 409);
    }

    // Back up the exact packed source before any normalization/identity repair is persisted.
    await env.PANTHEON_DB.prepare(`
      INSERT OR IGNORE INTO tracker_legacy_backups (id, name, record_json, source_updated_at, backed_up_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(MAIN_ID, String(source.row.name || 'Pantheon DN Tracker'), String(source.row.record_json), Number(source.row.updated_at) || 0, Date.now()).run();

    if (bootstrapOwnerRepaired) {
      const repairedAt = Math.max(Date.now(), (Number(source.row.updated_at) || 0) + 1);
      source.record.updatedAt = repairedAt;
      const repairedPacked = JSON.stringify(encodePantheonCompactRecord(source.record));
      const repairedWrite = await env.PANTHEON_DB.prepare(`
        UPDATE data_records SET record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(repairedPacked, repairedAt, MAIN_ID, String(source.row.record_json)).run();
      if (Number(repairedWrite?.meta?.changes) !== 1) throw new Error('The legacy Tracker changed after the migration snapshot was read. No player data was imported; check status and retry.');
      source.row.record_json = repairedPacked;
      source.row.updated_at = repairedAt;
    }

    await renewMigrationLock(env, lockToken);
    const indexStats = await syncCharacterIndexes(env, source.record, Date.now());
    await syncCharacterStorageSettings(env, source.record, Date.now());
    const mapped = new Map(index.characters.map(item => [item.characterKey, item]));

    // Merge legacy duplicate spellings into one normalized cell key. Select the newest
    // server/client timestamp deterministically rather than letting object order decide.
    const migratedCells = new Map();
    const orphanNames = new Map();
    for (const [rawCharacter, rawTasks] of Object.entries(obj(source.record.cells))) {
      const characterName = String(rawCharacter || '').trim().slice(0, 40);
      const charKey = characterKey(characterName);
      if (!characterName || !charKey) continue;
      if (!mapped.has(charKey)) orphanNames.set(charKey, characterName);
      for (const [rawTask, rawCell] of Object.entries(obj(rawTasks))) {
        const taskName = String(rawTask || '').trim().slice(0, 140);
        const normalizedTaskKey = taskKey(taskName);
        const cell = obj(rawCell);
        if (!taskName || !normalizedTaskKey) continue;
        const candidate = {
          characterKey:charKey,
          characterName,
          taskKey:normalizedTaskKey,
          taskName,
          state:['open','done','excluded','marked','reset'].includes(cell.state) ? cell.state : 'open',
          note:String(cell.note || '').slice(0, 40),
          updatedAt:Number(cell.updatedAt) || 0,
          deviceId:String(cell.deviceId || '').slice(0, 120)
        };
        const composite = JSON.stringify([charKey, normalizedTaskKey]);
        if (preferCell(candidate, migratedCells.get(composite))) migratedCells.set(composite, candidate);
      }
    }

    // Completion timing has a shorter useful horizon. Preserve the latest observation for
    // each normalized (character, week, task) key within the 90-day import window.
    const migratedTiming = new Map();
    const timing = obj(source.record.completionTiming);
    const timingCutoff = Date.now() - TIMING_IMPORT_DAYS * 24 * 60 * 60 * 1000;
    for (const [weekKey, rawCharacters] of Object.entries(timing)) {
      const weekAt = Number(weekKey);
      if (!Number.isFinite(weekAt) || weekAt < timingCutoff || weekAt > Date.now() + 24 * 60 * 60 * 1000) continue;
      for (const [rawCharacter, rawTasks] of Object.entries(obj(rawCharacters))) {
        const characterName = String(rawCharacter || '').trim().slice(0, 40);
        const charKey = characterKey(characterName);
        if (!charKey) continue;
        if (!mapped.has(charKey)) orphanNames.set(charKey, characterName);
        for (const [rawTask, rawValue] of Object.entries(obj(rawTasks))) {
          const taskName = String(rawTask || '').trim().slice(0, 140);
          const normalizedTaskKey = taskKey(taskName);
          if (!taskName || !normalizedTaskKey) continue;
          const value = typeof rawValue === 'number' ? { state:'done', at:rawValue, ownerKey:'' } : obj(rawValue);
          const at = Number(value.at) || Number(value.updatedAt) || 0;
          if (!at || at < timingCutoff || at > Date.now() + 24 * 60 * 60 * 1000) continue;
          const candidate = {
            characterKey:charKey,
            characterName,
            weekKey:String(weekKey),
            taskKey:normalizedTaskKey,
            taskName,
            state:value.state === 'done' ? 'done' : 'open',
            at,
            ownerKey:String(value.ownerKey || value.owner || '').slice(0, 120)
          };
          const composite = JSON.stringify([charKey, candidate.weekKey, normalizedTaskKey]);
          if (preferTiming(candidate, migratedTiming.get(composite))) migratedTiming.set(composite, candidate);
        }
      }
    }

    // Preserve legacy/orphan progress with inactive placeholder owners. It remains visible
    // in aggregate reads but cannot be edited until an administrator registers the IGN.
    const statements = [];
    for (const [charKey, characterName] of orphanNames) {
      statements.push(env.PANTHEON_DB.prepare(`
        INSERT INTO character_owners (character_key, character_name, member_id, owner_name, owner_discord_id, tracker_enabled, active, updated_at)
        VALUES (?, ?, '', '', '', 0, 0, ?)
        ON CONFLICT(character_key) DO NOTHING
      `).bind(charKey, characterName, Date.now()));
    }
    for (const item of migratedCells.values()) {
      statements.push(env.PANTHEON_DB.prepare(`
        INSERT INTO character_task_cells (character_key, task_key, task_name, state, note, updated_at, device_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(character_key, task_key) DO UPDATE SET
          task_name = excluded.task_name, state = excluded.state, note = excluded.note,
          updated_at = excluded.updated_at, device_id = excluded.device_id
      `).bind(item.characterKey, item.taskKey, item.taskName, item.state, item.note, item.updatedAt || Date.now(), item.deviceId));
    }
    for (const item of migratedTiming.values()) {
      statements.push(env.PANTHEON_DB.prepare(`
        INSERT INTO character_completion_timing (character_key, week_key, task_key, task_name, state, at, owner_key)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(character_key, week_key, task_key) DO UPDATE SET
          task_name = excluded.task_name, state = excluded.state, at = excluded.at, owner_key = excluded.owner_key
      `).bind(item.characterKey, item.weekKey, item.taskKey, item.taskName, item.state, item.at, item.ownerKey));
    }

    // Each batch is transactional. Renew and validate the tokenized lock before every batch;
    // if this Worker is delayed or another migration takes over after lease expiry, it stops.
    for (let offset = 0; offset < statements.length; offset += 75) {
      await renewMigrationLock(env, lockToken);
      await env.PANTHEON_DB.batch(statements.slice(offset, offset + 75));
    }
    await renewMigrationLock(env, lockToken);

    const finalAt = Date.now();
    await env.PANTHEON_DB.prepare(`
      INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json)
      VALUES (?, ?, ?, ?, ?)
    `).bind(actor, 'character-progress-storage-migration', '', finalAt, JSON.stringify({
      characterCount:indexStats.characterCount,
      cellCount:migratedCells.size,
      timingCount:migratedTiming.size,
      orphanCharacterCount:orphanNames.size,
      unlinkedCharacterCount:indexStats.unlinkedCharacters.length,
      bootstrapOwnerRepaired
    })).run();

    const complete = await env.PANTHEON_DB.prepare(`
      UPDATE tracker_storage_meta
      SET migration_complete = 1, migration_in_progress = 0, migration_lock_until = 0,
          migration_lock_token = '', schema_version = 1, migration_at = ?, revision = revision + 1, updated_at = ?
      WHERE id = 1 AND migration_complete = 0 AND migration_in_progress = 1 AND migration_lock_token = ?
    `).bind(finalAt, finalAt, lockToken).run();
    if (Number(complete?.meta?.changes) !== 1) throw new Error('The migration lock was lost before completion. No legacy data was deleted; check status and safely rerun the migration.');
    migrationCompleted = true;

    const finalStatus = await getStatus(env);
    return jsonResponse({ ok:true, migratedNow:true, ...finalStatus, orphanCharacters:[...orphanNames.values()], unlinkedCharacters:indexStats.unlinkedCharacters, bootstrapOwnerRepaired });
  } catch (error) {
    return jsonResponse({ error:`Character storage migration did not complete. No legacy data was deleted. ${String(error?.message || error).slice(0, 300)}` }, 500);
  } finally {
    if (lockAcquired && !migrationCompleted) {
      try {
        await env.PANTHEON_DB.prepare(`
          UPDATE tracker_storage_meta SET migration_in_progress = 0, migration_lock_until = 0, migration_lock_token = ''
          WHERE id = 1 AND migration_complete = 0 AND migration_in_progress = 1 AND migration_lock_token = ?
        `).bind(lockToken).run();
      } catch (_) { /* The tokenized lease expires automatically if cleanup is interrupted. */ }
    }
  }
}

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let requestBody;
  try { requestBody = await context.request.json(); }
  catch (_) { return jsonResponse({ error:'A JSON confirmation request is required.' }, 400); }
  if (requestBody?.confirm !== true) return jsonResponse({ error:'Set confirm=true to run the storage migration.' }, 400);
  if (context.data?.session?.role !== 'admin' || context.request.headers.get('X-Pantheon-Admin-Mode') !== '1') {
    return jsonResponse({ error:'Enable Admin View before using the manual migration endpoint.' }, 403);
  }
  try {
    await ensureCharacterStorageSchema(context.env);
    return await performCharacterStorageMigration(context);
  } catch (error) {
    return jsonResponse({ error:`Player storage could not be initialized. The original Tracker remains available. ${String(error?.message || error).slice(0, 240)}` }, 503);
  }
}
