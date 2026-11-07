import { jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { characterKey, getCharacterStorageState, taskKey } from '../../../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const CELL_STATES = new Set(['open','done','excluded','marked','reset']);
const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

// Character progress writes no longer read or rewrite pantheon-main. Each task cell is
// one independently addressed D1 row; unrelated players/characters cannot invalidate it.
export async function onRequestPost(context) {
  const { params, request, env, data } = context;
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  if (!targetId) return jsonResponse({ message:'Invalid record ID.' },400);
  if (targetId !== MAIN_ID) return jsonResponse({ message:'Character progress can only be saved to the main Tracker.' },400);

  let body;
  try { body = await request.json(); } catch (_) { return jsonResponse({ message:'Invalid JSON body.' },400); }
  const character = String(body?.character || '').trim().slice(0,40);
  const charKey = characterKey(character);
  const edits = Array.isArray(body?.edits) ? body.edits : [];
  if (!character || !charKey || !edits.length) return jsonResponse({ message:'A character and at least one task edit are required.' },400);
  // Keep each atomic write batch bounded. The browser splits large reset queues into
  // batches of 40; reject oversized legacy clients rather than silently truncating edits.
  if (edits.length > 40) return jsonResponse({ code:'CELL_BATCH_TOO_LARGE', retryable:false, message:'This save contains too many task edits for one request. Refresh Pantheon to send the retained changes in smaller batches.' },413);
  const cleanEdits = [];
  const seenTasks = new Set();
  for (const raw of edits) {
    const item = obj(raw);
    const taskName = String(item.taskName || '').trim().slice(0,140);
    const key = taskKey(taskName);
    const state = String(item.state || 'open');
    const note = String(item.note || '').slice(0,40);
    if (!taskName || !key || !CELL_STATES.has(state)) return jsonResponse({ code:'INVALID_TASK_EDIT', retryable:false, message:'One or more task edits are invalid.' },400);
    if (seenTasks.has(key)) return jsonResponse({ code:'DUPLICATE_TASK_EDIT', retryable:false, message:'Duplicate task edits were submitted for the same character.' },400);
    seenTasks.add(key);
    cleanEdits.push({ taskName, taskKey:key, state, note });
  }

  let storageState;
  try { storageState = await getCharacterStorageState(env); }
  catch (_) { return jsonResponse({ code:'CHARACTER_STORAGE_SCHEMA_MISSING', retryable:true, message:'Player storage is being prepared by the administrator. Your edit is retained and will retry after setup completes.' },503); }
  if (Number(storageState?.migration_complete) !== 1) {
    return jsonResponse({ code:'CHARACTER_STORAGE_NOT_MIGRATED', retryable:true, message:'Player storage is being prepared. Your edit is retained and will retry automatically when setup completes.' },503);
  }

  const session = data?.session;
  if (!session?.discordId) return jsonResponse({ code:'AUTH_REQUIRED', retryable:false, message:'Your Discord session has expired. Sign in again; your edits remain on this device.' },401);
  const adminOverride = session.role === 'admin' && request.headers.get('X-Pantheon-Admin-Mode') === '1';

  let owner;
  try {
    owner = await env.PANTHEON_DB.prepare(`
      SELECT character_key, character_name, member_id, owner_name, owner_discord_id, tracker_enabled, active
      FROM character_owners WHERE character_key = ? LIMIT 1
    `).bind(charKey).first();
  } catch (_) {
    return jsonResponse({ code:'CHARACTER_OWNER_INDEX_UNAVAILABLE', retryable:false, message:'The character ownership index is unavailable. Ask an administrator to check player storage migration.' },503);
  }
  if (!owner || Number(owner.active) !== 1) {
    return jsonResponse({ code:'CHARACTER_NOT_REGISTERED', retryable:false, message:`${character} is not currently registered to an active Member Roster owner. Ask an administrator to verify the roster.` },403);
  }
  if (!adminOverride && (!owner.owner_discord_id || String(owner.owner_discord_id) !== String(session.discordId))) {
    return jsonResponse({ code:'CHARACTER_OWNER_MISMATCH', retryable:false, message:`You can view ${character}'s progress, but only its registered Discord owner or an administrator in Admin Mode can change it.` },403);
  }
  if (!adminOverride && Number(owner.tracker_enabled) !== 1) {
    return jsonResponse({ code:'TRACKER_NOT_ENABLED', retryable:false, message:`${character} is registered but is not enabled for Tracker participation. Ask an administrator to enable its Tracker registration.` },403);
  }

  const taskPlaceholders = cleanEdits.map(() => '?').join(',');
  let configured;
  try {
    configured = await env.PANTHEON_DB.prepare(`
      SELECT task_key FROM tracker_task_definitions
      WHERE active = 1 AND task_key IN (${taskPlaceholders})
    `).bind(...cleanEdits.map(item => item.taskKey)).all();
  } catch (_) {
    return jsonResponse({ code:'TASK_INDEX_UNAVAILABLE', retryable:false, message:'The Tracker task index is unavailable. Ask an administrator to refresh the shared task definitions.' },503);
  }
  const configuredKeys = new Set((configured.results || []).map(row => String(row.task_key)));
  const invalid = cleanEdits.find(item => !configuredKeys.has(item.taskKey));
  if (invalid) return jsonResponse({ code:'TASK_NOT_CONFIGURED', retryable:false, message:`Task "${invalid.taskName}" is no longer in the current Tracker categories. Refresh the Tracker before editing it.` },400);

  const now = Date.now();
  const statements = [env.PANTHEON_DB.prepare(`
    UPDATE tracker_storage_meta
    SET revision = revision + 1,
        updated_at = CASE WHEN ? > updated_at THEN ? ELSE updated_at + 1 END
    WHERE id = 1 AND migration_complete = 1
  `).bind(now, now)];
  cleanEdits.forEach((edit, index) => {
    const stamp = now + index;
    statements.push(env.PANTHEON_DB.prepare(`
      INSERT INTO character_task_cells (character_key, task_key, task_name, state, note, updated_at, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_key, task_key) DO UPDATE SET
        task_name = excluded.task_name,
        state = excluded.state,
        note = excluded.note,
        updated_at = CASE WHEN excluded.updated_at > character_task_cells.updated_at THEN excluded.updated_at ELSE character_task_cells.updated_at + 1 END,
        device_id = excluded.device_id
    `).bind(charKey, edit.taskKey, edit.taskName, edit.state, edit.note, stamp, String(session.discordId).slice(0,120)));
  });
  // D1 enforces a small compound-SELECT term limit. Do not generate one UNION ALL
  // branch per task: a weekly reset can update dozens of cells at once. Expand a JSON
  // array with json_each(), which is a single SELECT regardless of batch length.
  const cellKeysJson = JSON.stringify(cleanEdits.map(edit => edit.taskKey));
  statements.push(env.PANTHEON_DB.prepare(`
    INSERT INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision)
    SELECT 'cell', ?, CAST(changed.value AS TEXT), '', meta.revision
    FROM json_each(?) AS changed
    CROSS JOIN tracker_storage_meta AS meta
    WHERE meta.id = 1
    ON CONFLICT(change_type, character_key, task_key, week_key) DO UPDATE SET revision = excluded.revision
  `).bind(charKey, cellKeysJson));

  // Preserve the existing per-character timing evidence, but store it separately as well.
  const timingInput = Array.isArray(body?.timing) ? body.timing.slice(0,40) : [];
  if (timingInput.length && owner.member_id && Number(storageState?.analytics_tracking_enabled) === 1) {
    const allowedTiming = [];
    const nowCutoff = now - 42 * 24 * 60 * 60 * 1000;
    const clearedAt = Number(storageState?.analytics_history_cleared_at) || 0;
    for (const raw of timingInput) {
      const item = obj(raw);
      const key = taskKey(item.taskName);
      const edit = cleanEdits.find(value => value.taskKey === key);
      const weekKey = String(item.weekKey || '');
      const weekAt = Number(weekKey);
      if (!edit || !['done','open'].includes(item.state) || edit.state !== item.state || !Number.isFinite(weekAt) || weekAt < nowCutoff || weekAt > now + 24 * 60 * 60 * 1000 || now < clearedAt) continue;
      allowedTiming.push({ edit, weekKey, state:item.state });
    }
    for (let i = 0; i < allowedTiming.length; i++) {
      const item = allowedTiming[i];
      statements.push(env.PANTHEON_DB.prepare(`
        INSERT INTO character_completion_timing (character_key, week_key, task_key, task_name, state, at, owner_key)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(character_key, week_key, task_key) DO UPDATE SET
          task_name = excluded.task_name,
          state = excluded.state,
          at = CASE WHEN excluded.at > character_completion_timing.at THEN excluded.at ELSE character_completion_timing.at + 1 END,
          owner_key = excluded.owner_key
      `).bind(charKey, item.weekKey, item.edit.taskKey, item.edit.taskName, item.state, now + cleanEdits.length + i, String(owner.member_id || owner.owner_name || '').slice(0,120)));
    }
    if (allowedTiming.length) {
      const timingLogJson = JSON.stringify(allowedTiming.map(item => ({ taskKey:item.edit.taskKey, weekKey:item.weekKey })));
      statements.push(env.PANTHEON_DB.prepare(`
        INSERT INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision)
        SELECT 'timing', ?,
               CAST(json_extract(changed.value, '$.taskKey') AS TEXT),
               CAST(json_extract(changed.value, '$.weekKey') AS TEXT),
               meta.revision
        FROM json_each(?) AS changed
        CROSS JOIN tracker_storage_meta AS meta
        WHERE meta.id = 1
        ON CONFLICT(change_type, character_key, task_key, week_key) DO UPDATE SET revision = excluded.revision
      `).bind(charKey, timingLogJson));
    }
  }
  // A singleton feed marker lets the server detect writes from older deployments
  // that incremented the storage revision but did not emit incremental change entries.
  statements.push(env.PANTHEON_DB.prepare(`
    INSERT INTO tracker_storage_changes (change_type, character_key, task_key, week_key, revision)
    SELECT 'feed', '', '', '', revision FROM tracker_storage_meta WHERE id = 1
    ON CONFLICT(change_type, character_key, task_key, week_key) DO UPDATE SET revision = excluded.revision
  `));
  // Keep each character's own timing history bounded without scanning the guild table.
  statements.push(env.PANTHEON_DB.prepare('DELETE FROM character_completion_timing WHERE character_key = ? AND at < ?').bind(charKey, now - 90 * 24 * 60 * 60 * 1000));
  try {
    // D1 batches execute as a transaction. The affected rows are limited to this character.
    await env.PANTHEON_DB.batch(statements);
    const savedRows = await env.PANTHEON_DB.prepare(`
      SELECT task_key, task_name, state, note, updated_at, device_id
      FROM character_task_cells
      WHERE character_key = ? AND task_key IN (${taskPlaceholders})
    `).bind(charKey, ...cleanEdits.map(item => item.taskKey)).all();
    const savedByTask = new Map((savedRows.results || []).map(row => [String(row.task_key), row]));
    const savedEdits = cleanEdits.map(edit => {
      const row = savedByTask.get(edit.taskKey);
      return row ? { taskName:String(row.task_name || edit.taskName), state:String(row.state), note:String(row.note || ''), updatedAt:Number(row.updated_at) || 0, deviceId:String(row.device_id || '') } : null;
    }).filter(Boolean);
    if (savedEdits.length !== cleanEdits.length) {
      return jsonResponse({ code:'SAVE_ACK_INCOMPLETE', retryable:true, message:'The save completed but the server could not confirm every affected task. Your edits remain queued for verification.' },503);
    }
    const revision = await getCharacterStorageState(env);
    return jsonResponse({ metadata:{ id:requestedId, updatedAt:Number(revision?.updated_at) || now, revision:Number(revision?.revision) || 0, character:owner.character_name }, character:owner.character_name, edits:savedEdits });
  } catch (error) {
    const message = String(error?.message || error).slice(0,300);
    const retryable = /busy|locked|timeout|temporar|network|overload|unavailable/i.test(message);
    return jsonResponse({ code: retryable ? 'DATABASE_TEMPORARY_FAILURE' : 'DATABASE_WRITE_FAILURE', retryable, message:`Character progress could not be written: ${message}` }, retryable ? 503 : 500);
  }
}
