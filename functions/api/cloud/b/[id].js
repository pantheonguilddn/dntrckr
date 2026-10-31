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
function normalizeTimingEntry(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return { state: 'done', at: value, ownerKey: '' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const at = Number(value.at) || Number(value.updatedAt) || 0;
  if (!at) return null;
  return { state: value.state === 'done' ? 'done' : 'open', at, ownerKey: String(value.ownerKey || value.owner || '').slice(0, 120) };
}
function chooseTimingEntry(existingValue, incomingValue) {
  const existing = normalizeTimingEntry(existingValue), incoming = normalizeTimingEntry(incomingValue);
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.at !== existing.at) return incoming.at > existing.at ? incoming : existing;
  // Match the browser: an explicit open/reopen at the same timestamp wins.
  return incoming.state === 'open' ? incoming : existing;
}
function mergeCompletionTimingRecords(currentValue, incomingValue, clearedAt = 0) {
  const current = obj(currentValue), incoming = obj(incomingValue), merged = {};
  const now = Date.now(), cutoff = now - 42 * 24 * 60 * 60 * 1000, clearAt = Number(clearedAt) || 0;
  for (const weekKey of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    const wk = Number(weekKey);
    if (!Number.isFinite(wk) || wk < cutoff || wk > now + 24 * 60 * 60 * 1000) continue;
    const curChars = obj(current[weekKey]), incChars = obj(incoming[weekKey]), chars = {};
    for (const charName of new Set([...Object.keys(curChars), ...Object.keys(incChars)])) {
      const curTasks = obj(curChars[charName]), incTasks = obj(incChars[charName]), tasks = {};
      for (const taskName of new Set([...Object.keys(curTasks), ...Object.keys(incTasks)])) {
        const entry = chooseTimingEntry(curTasks[taskName], incTasks[taskName]);
        if (entry && entry.at >= clearAt && entry.at >= cutoff && entry.at <= now + 24 * 60 * 60 * 1000) tasks[taskName] = entry;
      }
      if (Object.keys(tasks).length) chars[String(charName).slice(0, 120)] = tasks;
    }
    if (Object.keys(chars).length) merged[String(wk)] = chars;
  }
  const latestWeeks = Object.keys(merged).sort((a,b) => Number(a) - Number(b)).slice(-6);
  return Object.fromEntries(latestWeeks.map(key => [key, merged[key]]));
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
    const current = await env.PANTHEON_DB.prepare('SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
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
        const incomingCells = obj(next.cells);
        const cellWriteIntents = Array.isArray(incomingRecord?.cellWriteIntents) ? incomingRecord.cellWriteIntents.slice(0, 5000) : [];
        next.cells = mergeCellRecords(previous?.cells, incomingCells);
        for (const rawIntent of cellWriteIntents) {
          const intent = obj(rawIntent);
          const charName = String(intent.charName || '').trim().slice(0, 40);
          const taskName = String(intent.taskName || '').trim().slice(0, 140);
          const state = String(intent.state || 'open');
          const note = String(intent.note || '').slice(0, 40);
          const submittedCell = normalizedCell(incomingCells?.[charName]?.[taskName]);
          if (!charName || !taskName || !CELL_STATES.has(state) || !submittedCell || submittedCell.state !== state || submittedCell.note !== note) continue;
          if (!next.cells[charName]) next.cells[charName] = {};
          // Preserve the submitted edit so the registration guard can validate ownership
          // before the authoritative server timestamp is assigned.
          next.cells[charName][taskName] = { ...submittedCell, state, note };
        }
        // Group-run timing is shared learning data. Merge it independently so members' whole-record
        // syncs cannot erase another member's timestamps. A newer history-clear marker always wins.
        next.settings = next.settings && typeof next.settings === 'object' ? next.settings : {};
        const previousClearAt = Number(previous?.settings?.analyticsHistoryClearedAt) || 0;
        const incomingClearAt = Number(next.settings.analyticsHistoryClearedAt) || 0;
        const timingClearAt = Math.max(previousClearAt, incomingClearAt);
        if (previousClearAt > incomingClearAt) {
          next.settings.analyticsHistoryClearedAt = previousClearAt;
          next.settings.analyticsHistoryClearedBy = String(previous?.settings?.analyticsHistoryClearedBy || '');
        }
        next.completionTiming = mergeCompletionTimingRecords(previous?.completionTiming, next.completionTiming, timingClearAt);

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

      // Explicit cell-write intents are stamped by the server, not by the member's
      // workstation clock. This prevents a clock-skewed client from losing a valid
      // checkbox/note edit to a newer timestamp generated on another device. Intents
      // are transient request metadata and are never stored in the shared record.
      for (const rawIntent of cellWriteIntents) {
        const intent = obj(rawIntent);
        const charName = String(intent.charName || '').trim().slice(0, 40);
        const taskName = String(intent.taskName || '').trim().slice(0, 140);
        const state = String(intent.state || 'open');
        const note = String(intent.note || '').slice(0, 40);
        if (!charName || !taskName || !CELL_STATES.has(state)) continue;
        const candidateCell = normalizedCell(next.cells?.[charName]?.[taskName]);
        // Do not let an intent become an alternate write channel; it must exactly
        // describe the cell already present in the guarded candidate record.
        if (!candidateCell || candidateCell.state !== state || candidateCell.note !== note) continue;
        const priorCell = normalizedCell(previous?.cells?.[charName]?.[taskName]);
        const serverStamp = Math.max(Date.now(), (Number(priorCell?.updatedAt) || 0) + 1);
        if (!next.cells[charName]) next.cells[charName] = {};
        next.cells[charName][taskName] = {
          state,
          note,
          updatedAt: serverStamp,
          deviceId: String(candidateCell.deviceId || context.data?.session?.discordId || '').slice(0, 120)
        };
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
    const savedAt = Math.max(Date.now(), (Number(current.updated_at) || 0) + 1);
    try {
      writeResult = await env.PANTHEON_DB.prepare(`
        UPDATE data_records SET name = ?, record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(current.name || 'Pantheon record', JSON.stringify(recordToStore), savedAt, targetId, current.record_json).run();
    } catch (error) {
      return jsonResponse({ message: String(error?.message || error) }, 413);
    }
    if (Number(writeResult?.meta?.changes) > 0) {
      return jsonResponse({ metadata: { id: requestedId, name: current.name, private: true, updatedAt: savedAt }, record: responseRecord });
    }
    // Another writer changed the row between SELECT and UPDATE. Re-read and merge again.
  }
  return jsonResponse({ error: 'The shared tracker changed repeatedly while saving. Your local edit is retained; press Sync Changes to retry.', message: 'Concurrent tracker updates detected.' }, 409);
}
