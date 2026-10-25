import { getRecord, jsonResponse, resolveRecordId, storeRecord } from '../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../_utils/compact.js';
import { registrationWriteViolation } from '../../../_utils/registration-guard.js';
import { denyNonAdminRevisionJournalAccess } from '../../../_utils/admin-tool-access.js';

const MAIN_ID = 'pantheon-main';

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
  if (targetId === MAIN_ID && context.data?.session?.role !== 'admin') {
    try {
      const previousPacked = JSON.parse(current.record_json);
      const previous = decodePantheonCompactRecord(previousPacked);
      const next = decodePantheonCompactRecord(record);
      const violation = registrationWriteViolation(previous, next, context.data?.session);
      if (violation) return jsonResponse({ error: violation, message: violation }, 403);
      // Rate-Up scheduling is a shared admin-owned setting. A member's ordinary tracker sync
      // must never alter or erase this schedule, even if their cached record predates the field.
      next.settings = next.settings && typeof next.settings === 'object' ? next.settings : {};
      next.settings.rateUpEvents = previous.settings?.rateUpEvents || {
        itemDrop: { enabled: false, schedule: 'weekend', customStart: '', customEnd: '' },
        enhancement: { enabled: false, schedule: 'weekend', customStart: '', customEnd: '' }
      };
      next.settings.rateUpEventsUpdatedAt = Number(previous.settings?.rateUpEventsUpdatedAt) || 0;
      next.settings.rateUpEventsUpdatedBy = String(previous.settings?.rateUpEventsUpdatedBy || '');
      record = encodePantheonCompactRecord(next);
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
