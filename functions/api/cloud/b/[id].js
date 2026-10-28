import { getRecord, jsonResponse, resolveRecordId, storeRecord } from '../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../_utils/compact.js';
import { registrationWriteViolation } from '../../../_utils/registration-guard.js';
import { denyNonAdminRevisionJournalAccess } from '../../../_utils/admin-tool-access.js';

const MAIN_ID = 'pantheon-main';
const LEDGER_OWNER_NAMES = new Set(['bio', 'cheean', 'cho']);
const CELL_STATES = new Set(['open', 'done', 'excluded', 'marked', 'reset']);
function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function normalizedCell(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    state: CELL_STATES.has(value.state) ? value.state : 'open',
    note: String(value.note || '').slice(0, 40),
    updatedAt: Number(value.updatedAt) || 0,
    deviceId: String(value.deviceId || '')
  };
}
function chooseCell(existingValue, incomingValue) {
  const existing = normalizedCell(existingValue), incoming = normalizedCell(incomingValue);
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.updatedAt !== existing.updatedAt) return incoming.updatedAt > existing.updatedAt ? incoming : existing;
  // Match the browser's deterministic tie-break: the lexically later device ID wins;
  // when both are the same device, the incoming explicit save wins.
  return incoming.deviceId >= existing.deviceId ? incoming : existing;
}
function mergeCellRecords(currentCells, incomingCells) {
  const current = obj(currentCells), incoming = obj(incomingCells), merged = {};
  for (const charName of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    const currentTasks = obj(current[charName]), incomingTasks = obj(incoming[charName]), tasks = {};
    for (const taskName of new Set([...Object.keys(currentTasks), ...Object.keys(incomingTasks)])) {
      const cell = chooseCell(currentTasks[taskName], incomingTasks[taskName]);
      if (cell) tasks[taskName] = cell;
    }
    if (Object.keys(tasks).length) merged[charName] = tasks;
  }
  return merged;
}
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
  let incomingRecord;
  try { incomingRecord = await request.json(); } catch (_) { return jsonResponse({ message: 'Invalid JSON body.' }, 400); }

  // Main tracker sync is a whole-record payload, so concurrent clients can otherwise
  // overwrite one another between the read and write. Merge task records against the
  // latest D1 value, then use a compare-and-swap UPDATE. Retry if another writer wins.
  // This keeps the existing API contract and does not require a schema migration.
  for (let attempt = 1; attempt <= 5; attempt++) {
    const current = await env.PANTHEON_DB.prepare('SELECT id, name, record_json FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
    if (!current) return jsonResponse({ message: 'Record not found.' }, 404);

    let recordToStore = incomingRecord;
    let responseRecord = incomingRecord;
    if (targetId === MAIN_ID) {
      try {
        const previousPacked = JSON.parse(current.record_json);
        const previous = decodePantheonCompactRecord(previousPacked);
        const next = decodePantheonCompactRecord(incomingRecord);
        if (!next || typeof next !== 'object') return jsonResponse({ message: 'Invalid tracker record.' }, 400);
        // A stale tab may submit an old value for tasks it never edited. Keep the newer
        // per-cell record from D1 instead of allowing a routine sync to undo it.
        next.cells = mergeCellRecords(previous?.cells, next.cells);

        if (context.data?.session?.role !== 'admin') {
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
        }

        recordToStore = encodePantheonCompactRecord(next);
        responseRecord = recordToStore;
        const previousDecoded = previous;
        if (!hasLedgerAccess(context.data?.session, previousDecoded)) {
          // Preserve ledger contents for every non-allowlisted account, including admins.
          next.scholarship = previousDecoded.scholarship || {};
          recordToStore = encodePantheonCompactRecord(next);
          responseRecord = redactLedgerRecord(recordToStore);
        }
      } catch (error) {
        return jsonResponse({ error: `Could not validate tracker update: ${String(error?.message || error).slice(0, 250)}` }, 400);
      }
    }

    let writeResult;
    try {
      writeResult = await env.PANTHEON_DB.prepare(`
        UPDATE data_records SET name = ?, record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(current.name || 'Pantheon record', JSON.stringify(recordToStore), Date.now(), targetId, current.record_json).run();
    } catch (error) {
      return jsonResponse({ message: String(error?.message || error) }, 413);
    }
    if (Number(writeResult?.meta?.changes) > 0) {
      return jsonResponse({ metadata: { id: requestedId, name: current.name, private: true }, record: responseRecord });
    }
    // Another writer changed the row between SELECT and UPDATE. Re-read and merge again.
  }
  return jsonResponse({ error: 'The shared tracker changed repeatedly while saving. Your local edit is retained; press Sync Changes to retry.', message: 'Concurrent tracker updates detected.' }, 409);
}
