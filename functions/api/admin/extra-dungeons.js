import { jsonResponse, requireAdmin } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';
import { isCharacterStorageMigrationBusy } from '../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const MAX_EXTRA_DUNGEONS = 200;
const text = value => String(value ?? '').trim().slice(0, 140);

function weeklyDungeonCategories(record) {
  const categories = Array.isArray(record?.settings?.categories) ? record.settings.categories : [];
  return categories
    .filter(category => category && category.group === 'Weeklies' && !String(category.name || '').toLocaleLowerCase().includes('bounty'))
    .map(category => ({
      id: String(category.id || ''),
      name: String(category.name || 'Weekly dungeons').slice(0, 60),
      tasks: [...new Set((Array.isArray(category.tasks) ? category.tasks : []).map(text).filter(task => task && !/\bbounty\b/i.test(task)))]
    }))
    .filter(category => category.tasks.length);
}

async function readMainRecord(env) {
  const row = await env.PANTHEON_DB.prepare('SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(MAIN_ID).first();
  if (!row) return null;
  let packed;
  try { packed = JSON.parse(row.record_json); }
  catch (_) { throw new Error('The shared Pantheon main record is corrupt.'); }
  const record = decodePantheonCompactRecord(packed);
  if (!record || typeof record !== 'object' || !record.settings || typeof record.settings !== 'object') {
    throw new Error('The shared Pantheon main record has an unexpected structure.');
  }
  return { row, record };
}

function canonicalExtraTasks(record) {
  const allowed = new Map();
  for (const category of weeklyDungeonCategories(record)) {
    for (const task of category.tasks) allowed.set(task.toLocaleLowerCase(), task);
  }
  const current = Array.isArray(record?.settings?.extraDungeonTasks) ? record.settings.extraDungeonTasks : [];
  return [...new Set(current.map(value => allowed.get(text(value).toLocaleLowerCase())).filter(Boolean))];
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    const result = await readMainRecord(context.env);
    if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
    const settings = result.record.settings;
    return jsonResponse({
      categories: weeklyDungeonCategories(result.record),
      extraDungeonTasks: canonicalExtraTasks(result.record),
      updatedAt: Number(settings.extraDungeonTasksUpdatedAt) || 0,
      updatedBy: String(settings.extraDungeonTasksUpdatedBy || '')
    });
  } catch (error) {
    return jsonResponse({ error: String(error?.message || error).slice(0, 300) }, 500);
  }
}

export async function onRequestPut(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (await isCharacterStorageMigrationBusy(context.env)) {
    return jsonResponse({ code: 'CHARACTER_STORAGE_MIGRATION_BUSY', retryable: true, error: 'Guild settings are temporarily read-only while player storage is being migrated.' }, 503);
  }
  let body;
  try { body = await context.request.json(); }
  catch (_) { return jsonResponse({ error: 'Expected a JSON request body.' }, 400); }
  if (!Array.isArray(body.extraDungeonTasks) || body.extraDungeonTasks.length > MAX_EXTRA_DUNGEONS) {
    return jsonResponse({ error: `Extra Dungeons must be an array containing no more than ${MAX_EXTRA_DUNGEONS} task names.` }, 400);
  }
  const requested = [...new Set(body.extraDungeonTasks.map(text).filter(Boolean).map(value => value.toLocaleLowerCase()))];
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const result = await readMainRecord(context.env);
      if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
      const allowed = new Map();
      for (const category of weeklyDungeonCategories(result.record)) {
        for (const task of category.tasks) allowed.set(task.toLocaleLowerCase(), task);
      }
      const invalid = requested.filter(key => !allowed.has(key));
      if (invalid.length) return jsonResponse({ error: `These tasks are no longer available as weekly dungeon tasks: ${invalid.map(key => requested.find(value => value === key)).join(', ')}. Refresh the list and try again.` }, 400);
      const extraDungeonTasks = requested.map(key => allowed.get(key));
      const now = Date.now();
      result.record.settings.extraDungeonTasks = extraDungeonTasks;
      result.record.settings.extraDungeonTasksUpdatedAt = now;
      result.record.settings.extraDungeonTasksUpdatedBy = String(context.data.session.discordId || 'admin');
      result.record.updatedAt = now;
      const packed = encodePantheonCompactRecord(result.record);
      const recordJson = JSON.stringify(packed);
      if (recordJson.length > 2_000_000) return jsonResponse({ error: 'The shared Pantheon record is too large to update.' }, 413);
      const update = await context.env.PANTHEON_DB.prepare(
        'UPDATE data_records SET record_json = ?, updated_at = ? WHERE id = ? AND record_json = ?'
      ).bind(recordJson, now, MAIN_ID, result.row.record_json).run();
      const changes = Number(update?.meta?.changes ?? update?.changes ?? 0);
      if (changes < 1) continue;
      await context.env.PANTHEON_DB.prepare(
        'INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        context.data.session.discordId,
        'admin-extra-dungeons-update',
        '',
        now,
        JSON.stringify({ extraDungeonTasks, count: extraDungeonTasks.length })
      ).run();
      return jsonResponse({ ok: true, extraDungeonTasks, updatedAt: now, updatedBy: String(context.data.session.discordId || 'admin') });
    } catch (error) {
      return jsonResponse({ error: `Extra Dungeon settings update failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
    }
  }
  return jsonResponse({ error: 'The shared record changed during each save attempt. Refresh and save again; no tracker progress was replaced.' }, 409);
}
