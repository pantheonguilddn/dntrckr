import { getRecord, jsonResponse, resolveRecordId, storeRecord } from '../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../_utils/compact.js';
import { registrationWriteViolation } from '../../../_utils/registration-guard.js';
import { denyNonAdminRevisionJournalAccess } from '../../../_utils/admin-tool-access.js';

const MAIN_ID = 'pantheon-main';
const LEDGER_OWNER_NAMES = new Set(['bio', 'cheean', 'cho']);
function normalizeOwner(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }
function hasLedgerAccess(session, record) {
  if (!session?.discordId) return false;
  const candidates = [session.label, session.username].map(normalizeOwner).filter(Boolean);
  const members = Array.isArray(record?.settings?.memberDirectory) ? record.settings.memberDirectory : [];
  const confirmedOwner = members.find(member => String(member?.profileConfirmedDiscordId || '') === String(session.discordId));
  if (confirmedOwner && LEDGER_OWNER_NAMES.has(normalizeOwner(confirmedOwner.name))) return true;
  for (const candidate of candidates) {
    if (!LEDGER_OWNER_NAMES.has(candidate)) continue;
    const matchingMember = members.find(member => normalizeOwner(member?.name) === candidate);
    if (matchingMember?.profileConfirmedDiscordId && String(matchingMember.profileConfirmedDiscordId) !== String(session.discordId)) continue;
    return true;
  }
  return false;
}
function redactLedgerRecord(packed) {
  const decoded = decodePantheonCompactRecord(packed);
  if (!decoded || typeof decoded !== 'object') return packed;
  decoded.scholarship = {};
  return encodePantheonCompactRecord(decoded);
}

export async function onRequestGet(context) {
  const { params, env } = context;
  const requestedId = String(params.id || '');
  const denied = await denyNonAdminRevisionJournalAccess(context, requestedId);
  if (denied) return denied;
  const row = await getRecord(env, requestedId);
  if (!row) return jsonResponse({ message: 'Record not found.' }, 404);
  try {
    const packed = JSON.parse(row.record_json);
    const resolvedId = await resolveRecordId(env, requestedId);
    const decoded = decodePantheonCompactRecord(packed);
    const session = context.data?.session;
    const responseRecord = resolvedId === MAIN_ID && !hasLedgerAccess(session, decoded) ? redactLedgerRecord(packed) : packed;
    return jsonResponse({ metadata: { id: requestedId, name: row.name, private: true, updatedAt: row.updated_at }, record: responseRecord });
  } catch (_) { return jsonResponse({ message: 'Stored record is corrupt.' }, 500); }
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
      // UI text overrides are admin-owned shared configuration; stale member caches must not replace them.
      next.settings.uiTextOverrides = previous.settings?.uiTextOverrides || {};
      next.settings.uiTextOverridesUpdatedAt = Number(previous.settings?.uiTextOverridesUpdatedAt) || 0;
      next.settings.uiTextOverridesUpdatedBy = String(previous.settings?.uiTextOverridesUpdatedBy || '');
      record = encodePantheonCompactRecord(next);
    } catch (error) {
      return jsonResponse({ error: `Could not validate member registration changes: ${String(error?.message || error).slice(0, 250)}` }, 400);
    }
  }
  let responseRecord = record;
  if (targetId === MAIN_ID) {
    try {
      const previousDecoded = decodePantheonCompactRecord(JSON.parse(current.record_json));
      const nextDecoded = decodePantheonCompactRecord(record);
      if (!hasLedgerAccess(context.data?.session, previousDecoded)) {
        // Preserve ledger contents for every non-allowlisted account, including admins.
        nextDecoded.scholarship = previousDecoded.scholarship || {};
        record = encodePantheonCompactRecord(nextDecoded);
        responseRecord = redactLedgerRecord(record);
      } else responseRecord = record;
    } catch (error) {
      return jsonResponse({ error: `Could not enforce ledger access: ${String(error?.message || error).slice(0, 200)}` }, 400);
    }
  }
  try {
    await storeRecord(env, targetId, record, current.name || 'Pantheon record');
    return jsonResponse({ metadata: { id: requestedId, name: current.name, private: true }, record: responseRecord });
  } catch (error) {
    return jsonResponse({ message: String(error?.message || error) }, 413);
  }
}
