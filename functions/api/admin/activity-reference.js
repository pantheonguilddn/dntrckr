import { getRecord, jsonResponse, requireAdmin } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';
import { isCharacterStorageMigrationBusy } from '../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const MAX_ACTIVITIES = 200;
const asText = (value, max, fallback = '-') => String(value ?? fallback).trim().slice(0, max);
const slug = value => String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

function cleanActivity(profile, index) {
  const source = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  const rawAliases = Array.isArray(source.aliases) ? source.aliases : String(source.aliases || '').split(',');
  const aliases = [...new Set(rawAliases.map(value => asText(value, 80, '')).filter(Boolean))].slice(0, 20);
  const serviceableValue = String(source.serviceable || 'unknown').toLowerCase();
  return {
    id: slug(source.id || source.name) || `activity-${index + 1}`,
    name: asText(source.name, 100, ''),
    aliases,
    entries: asText(source.entries, 80),
    milestoneGoal: asText(source.milestoneGoal, 180),
    partySize: asText(source.partySize, 50),
    averageRunTime: asText(source.averageRunTime, 80),
    serviceable: ['yes', 'no', 'unknown'].includes(serviceableValue) ? serviceableValue : 'unknown',
    materials: asText(source.materials, 1800),
    weeklyRewards: asText(source.weeklyRewards, 1200),
    recommendation: asText(source.recommendation, 1500, '')
  };
}

async function getDecodedMainRecord(env) {
  // Use the exact same record-alias resolver as Tracker, Dungeon Registration and Extra Dungeons.
  // Writing to the literal legacy ID could silently create/update a second, disconnected row.
  const row = await getRecord(env, MAIN_ID);
  if (!row) return null;
  let raw;
  try { raw = JSON.parse(row.record_json); } catch (_) { throw new Error('The shared Pantheon main record is corrupt.'); }
  return { row, record: decodePantheonCompactRecord(raw) };
}

async function commitMainRecord(context, result, action, details) {
  const now = Date.now();
  result.record.updatedAt = now;
  const packed = encodePantheonCompactRecord(result.record);
  const recordJson = JSON.stringify(packed);
  if (recordJson.length > 2_000_000) throw new Error('The shared Pantheon record is too large to update.');
  const update = await context.env.PANTHEON_DB.prepare(
    'UPDATE data_records SET record_json = ?, updated_at = ? WHERE id = ? AND record_json = ?'
  ).bind(recordJson, now, result.row.id, result.row.record_json).run();
  const changes = Number(update?.meta?.changes ?? update?.changes ?? 0);
  if (changes < 1) return false;
  try {
    await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json) VALUES (?, ?, ?, ?, ?)')
      .bind(context.data.session.discordId, action, '', now, JSON.stringify(details || {})).run();
  } catch (_) { /* Audit logging is secondary to the committed shared record. */ }
  return now;
}

function normalizeProfileName(value) { return String(value || '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }

async function upsertOneActivity(context, body) {
  const taskName = asText(body.taskName, 100, '');
  if (!taskName) return jsonResponse({ error: 'Choose a registered dungeon task first.' }, 400);
  const source = body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile) ? body.profile : {};
  const incoming = cleanActivity({ ...source, name: taskName }, 0);
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const result = await getDecodedMainRecord(context.env);
      if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
      const settings = result.record?.settings;
      if (!settings) return jsonResponse({ error: 'The shared main record has an unexpected structure.' }, 500);
      const registered = (Array.isArray(settings.categories) ? settings.categories : []).some(category => (Array.isArray(category?.tasks) ? category.tasks : []).some(task => normalizeProfileName(task) === normalizeProfileName(taskName)));
      if (!registered) return jsonResponse({ error: 'This dungeon is no longer registered in Dungeon Registration. Reload the task list and try again.' }, 409);
      const activities = Array.isArray(settings.activityReferenceProfiles) ? settings.activityReferenceProfiles.map(item => ({ ...item })) : [];
      const key = normalizeProfileName(taskName);
      const index = activities.findIndex(profile => [profile.name, ...(Array.isArray(profile.aliases) ? profile.aliases : [])].some(value => normalizeProfileName(value) === key));
      if (index >= 0) {
        incoming.id = String(activities[index].id || incoming.id);
        const previousName = String(activities[index].name || '').trim();
        const aliases = [...(Array.isArray(incoming.aliases) ? incoming.aliases : [])];
        if (previousName && normalizeProfileName(previousName) !== key && !aliases.some(value => normalizeProfileName(value) === normalizeProfileName(previousName))) aliases.unshift(previousName);
        incoming.aliases = [...new Set(aliases)].slice(0, 20);
        activities[index] = incoming;
      } else {
        if (activities.length >= MAX_ACTIVITIES) return jsonResponse({ error: `The activity catalogue is full (${MAX_ACTIVITIES} entries).` }, 400);
        activities.push(incoming);
      }
      const now = Date.now();
      settings.activityReferenceProfiles = activities;
      settings.activityReferenceProfilesUpdatedAt = now;
      settings.activityReferenceProfilesUpdatedBy = String(context.data.session.discordId || 'admin');
      const committed = await commitMainRecord(context, result, 'admin-dungeon-details-update', { taskName, activityCount: activities.length });
      if (!committed) continue;
      return jsonResponse({ ok: true, taskName, activities, updatedAt: now, updatedBy: String(context.data.session.discordId || 'admin'), sourceRecordId: result.row.id });
    } catch (error) {
      return jsonResponse({ error: `Dungeon details update failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
    }
  }
  return jsonResponse({ error: 'The shared record changed during every save attempt. Reload Dungeon Registration and save the details again.' }, 409);
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    const result = await getDecodedMainRecord(context.env);
    if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
    const settings = result.record?.settings || {};
    return jsonResponse({
      activities: Array.isArray(settings.activityReferenceProfiles) ? settings.activityReferenceProfiles : [],
      updatedAt: Number(settings.activityReferenceProfilesUpdatedAt) || 0,
      updatedBy: String(settings.activityReferenceProfilesUpdatedBy || ''),
      sourceRecordId: result.row.id,
      recordUpdatedAt: Number(result.row.updated_at) || Number(result.record.updatedAt) || 0
    });
  } catch (error) {
    return jsonResponse({ error: String(error?.message || error).slice(0, 300) }, 500);
  }
}

export async function onRequestPut(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (await isCharacterStorageMigrationBusy(context.env)) return jsonResponse({ code:'CHARACTER_STORAGE_MIGRATION_BUSY', retryable:true, error:'Guild settings are temporarily read-only while player storage is being migrated.' }, 503);
  let body;
  try { body = await context.request.json(); } catch (_) { return jsonResponse({ error: 'Expected a JSON request body.' }, 400); }
  if (body?.taskName) return upsertOneActivity(context, body);
  if (!Array.isArray(body.activities) || body.activities.length < 1 || body.activities.length > MAX_ACTIVITIES) {
    return jsonResponse({ error: `Activities must be an array containing between 1 and ${MAX_ACTIVITIES} profiles.` }, 400);
  }
  const activities = body.activities.map(cleanActivity);
  if (activities.some(item => !item.name)) return jsonResponse({ error: 'Every activity needs a name.' }, 400);
  const names = new Set();
  for (const item of activities) {
    const key = item.name.toLocaleLowerCase();
    if (names.has(key)) return jsonResponse({ error: `Duplicate activity name: ${item.name}.` }, 400);
    names.add(key);
  }
  if (JSON.stringify(activities).length > 250_000) return jsonResponse({ error: 'Activity reference is too large. Keep the combined profile data below 250 KB.' }, 413);
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const result = await getDecodedMainRecord(context.env);
      if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
      const settings = result.record?.settings;
      if (!settings) return jsonResponse({ error: 'The shared main record has an unexpected structure.' }, 500);
      settings.activityReferenceProfiles = activities;
      settings.activityReferenceProfilesUpdatedAt = Date.now();
      settings.activityReferenceProfilesUpdatedBy = String(context.data.session.discordId || 'admin');
      const now = await commitMainRecord(context, result, 'admin-activity-reference-update', { activityCount: activities.length, activityNames: activities.map(item => item.name) });
      if (!now) continue;
      return jsonResponse({ ok: true, activities, updatedAt: now, updatedBy: String(context.data.session.discordId || 'admin'), sourceRecordId: result.row.id });
    } catch (error) {
      return jsonResponse({ error: `Activity reference update failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
    }
  }
  return jsonResponse({ error: 'The shared record changed during every save attempt. Reload and try again.' }, 409);
}
