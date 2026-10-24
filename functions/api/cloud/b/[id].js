import { getRecord, jsonResponse, resolveRecordId, storeRecord } from '../../../_utils/auth.js';
import { decodePantheonCompactRecord } from '../../../_utils/compact.js';
import { registrationWriteViolation } from '../../../_utils/registration-guard.js';
import { denyNonAdminRevisionJournalAccess } from '../../../_utils/admin-tool-access.js';

const MAIN_ID = 'pantheon-main';

// UI descriptions and Rate-Up schedules are administrator-managed shared settings.
// Normalize these fields before comparing so members may continue syncing the rest
// of the record without being able to alter them through a forged PUT request.
function stableUiCopy(record) {
  const source = record?.settings?.uiCopy;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return '{}';
  const output = {};
  for (const key of Object.keys(source).sort()) {
    const item = source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) ? source[key] : {};
    output[key] = {
      text: typeof item.text === 'string' ? item.text.slice(0, 1600) : '',
      updatedAt: Math.max(0, Number(item.updatedAt) || 0),
      updatedBy: String(item.updatedBy || '')
    };
  }
  return JSON.stringify(output);
}
function stableRateUpEvents(record) {
  const source = record?.settings?.rateUpEvents;
  const event = value => {
    const item = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      enabled: item.enabled === true,
      schedule: item.schedule === 'custom' ? 'custom' : 'weekend',
      startAt: Math.max(0, Number(item.startAt) || 0),
      endAt: Math.max(0, Number(item.endAt) || 0)
    };
  };
  const raw = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  return JSON.stringify({
    itemDrop: event(raw.itemDrop),
    enhancement: event(raw.enhancement),
    updatedAt: Math.max(0, Number(raw.updatedAt) || 0),
    updatedBy: String(raw.updatedBy || '')
  });
}

export async function onRequestGet(context) {
  const { params, env } = context;
  const requestedId = String(params.id || '');
  const denied = await denyNonAdminRevisionJournalAccess(context, requestedId);
  if (denied) return denied;
  const row = await getRecord(env, requestedId);
  if (!row) return jsonResponse({ message: 'Record not found.' }, 404);
  try { return jsonResponse({ metadata: { id: requestedId, name: row.name, private: true, updatedAt: row.updated_at }, record: JSON.parse(row.record_json) }); }
  catch (_) { return jsonResponse({ message: 'Stored record is corrupt.' }, 500); }
}

export async function onRequestPut(context) {
  const { params, request, env } = context;
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  const denied = await denyNonAdminRevisionJournalAccess(context, requestedId);
  if (denied) return denied;
  const current = await env.PANTHEON_DB.prepare('SELECT id, name, record_json FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
  if (!current) return jsonResponse({ message: 'Record not found.' }, 404);
  let record;
  try { record = await request.json(); } catch (_) { return jsonResponse({ message: 'Invalid JSON body.' }, 400); }
  if (targetId === MAIN_ID) {
    try {
      const previousForSafety = decodePantheonCompactRecord(JSON.parse(current.record_json));
      const nextForSafety = decodePantheonCompactRecord(record);
      const previousCategories = Array.isArray(previousForSafety?.settings?.categories) ? previousForSafety.settings.categories : [];
      const nextCategories = Array.isArray(nextForSafety?.settings?.categories) ? nextForSafety.settings.categories : [];
      const previousCategoryAt = Number(previousForSafety?.settings?.categoriesUpdatedAt) || 0;
      const nextCategoryAt = Number(nextForSafety?.settings?.categoriesUpdatedAt) || 0;
      if (previousCategories.length > 0 && nextCategories.length === 0 && nextCategoryAt <= previousCategoryAt) {
        return jsonResponse({ error: 'This sync would remove all Dungeon Registration categories without a newer category edit. Reload shared data before syncing; intentional removal must be made in Dungeon Registration.', message: 'This sync would remove all Dungeon Registration categories without a newer category edit. Reload shared data before syncing; intentional removal must be made in Dungeon Registration.' }, 409);
      }
    } catch (error) {
      return jsonResponse({ error: `Could not validate Dungeon Registration preservation: ${String(error?.message || error).slice(0, 250)}` }, 400);
    }
  }
  if (targetId === MAIN_ID && context.data?.session?.role !== 'admin') {
    try {
      const previousPacked = JSON.parse(current.record_json);
      const previous = decodePantheonCompactRecord(previousPacked);
      const next = decodePantheonCompactRecord(record);
      if (stableUiCopy(previous) !== stableUiCopy(next)) {
        return jsonResponse({ error: 'Only Pantheon administrators can edit shared UI descriptions.', message: 'Only Pantheon administrators can edit shared UI descriptions.' }, 403);
      }
      if (stableRateUpEvents(previous) !== stableRateUpEvents(next)) {
        return jsonResponse({ error: 'Only Pantheon administrators can edit Rate-Up event schedules.', message: 'Only Pantheon administrators can edit Rate-Up event schedules.' }, 403);
      }
      const violation = registrationWriteViolation(previous, next, context.data?.session);
      if (violation) return jsonResponse({ error: violation, message: violation }, 403);
    } catch (error) {
      return jsonResponse({ error: `Could not validate member registration changes: ${String(error?.message || error).slice(0, 250)}` }, 400);
    }
  }
  try {
    await storeRecord(env, targetId, record, current.name || 'Pantheon record');
    return jsonResponse({ metadata: { id: requestedId, name: current.name, private: true }, record });
  } catch (error) {
    return jsonResponse({ message: String(error?.message || error) }, 413);
  }
}
