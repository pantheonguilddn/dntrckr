import { jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../../_utils/compact.js';
import { registrationWriteViolation } from '../../../../_utils/registration-guard.js';

const MAIN_ID = 'pantheon-main';
const CELL_STATES = new Set(['open', 'done', 'excluded', 'marked', 'reset']);
function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function clone(value) { return JSON.parse(JSON.stringify(value ?? {})); }
function normalizedCell(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    state: CELL_STATES.has(value.state) ? value.state : 'open',
    note: String(value.note || '').slice(0, 40),
    updatedAt: Number(value.updatedAt) || 0,
    deviceId: String(value.deviceId || '')
  };
}

// A character's progress is saved independently. The D1 row is still one compact
// tracker record, but this endpoint accepts only one character's cell patches and
// performs a read/merge/CAS write so it cannot overwrite another character's data.
export async function onRequestPost(context) {
  const { params, request, env } = context;
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  if (!targetId) return jsonResponse({ message: 'Invalid Tracker record ID.' }, 400);
  if (targetId !== MAIN_ID) return jsonResponse({ message: 'Character progress patches are available only for the main Tracker record.' }, 400);

  let body;
  try { body = await request.json(); } catch (_) { return jsonResponse({ message: 'Invalid JSON body.' }, 400); }
  const charName = String(body?.charName || '').trim().slice(0, 40);
  const rawWrites = Array.isArray(body?.writes) ? body.writes.slice(0, 300) : [];
  if (!charName || !rawWrites.length) return jsonResponse({ message: 'A character name and at least one cell edit are required.' }, 400);

  const writes = [];
  const seen = new Set();
  for (const raw of rawWrites) {
    const item = obj(raw);
    const taskName = String(item.taskName || '').trim().slice(0, 140);
    const state = String(item.state || 'open');
    const note = String(item.note || '').slice(0, 40);
    if (!taskName || !CELL_STATES.has(state) || seen.has(taskName)) continue;
    seen.add(taskName);
    const timing = obj(item.timing);
    const timingAt = Number(timing.at) || 0;
    const timingState = String(timing.state || '');
    const weekKey = String(timing.weekKey || '').trim();
    const weekMs = Number(weekKey) || 0;
    const validTiming = (timingState === 'done' || timingState === 'open') && timingAt > 0 && weekMs > 0 && weekMs >= Date.now() - 42 * 86400000 && weekMs <= Date.now() + 86400000;
    writes.push({ taskName, state, note, timing: validTiming ? { weekKey, state: timingState, at: timingAt, ownerKey: String(timing.ownerKey || '').slice(0, 120) } : null });
  }
  if (!writes.length) return jsonResponse({ message: 'No valid cell edits were supplied.' }, 400);

  const session = context.data?.session;
  for (let attempt = 1; attempt <= 8; attempt++) {
    const current = await env.PANTHEON_DB.prepare('SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
    if (!current) return jsonResponse({ message: 'Tracker record not found.' }, 404);

    let previous;
    try { previous = decodePantheonCompactRecord(JSON.parse(current.record_json)); }
    catch (_) { return jsonResponse({ message: 'Stored tracker record is corrupt.' }, 500); }
    if (!previous || typeof previous !== 'object') return jsonResponse({ message: 'Stored tracker record is invalid.' }, 500);

    const next = clone(previous);
    next.cells = obj(next.cells);
    next.cells[charName] = { ...obj(next.cells[charName]) };
    const now = Date.now();
    const responseCells = {};
    for (const write of writes) {
      const prior = normalizedCell(previous.cells?.[charName]?.[write.taskName]);
      const cell = {
        state: write.state,
        note: write.note,
        updatedAt: Math.max(now, (Number(prior?.updatedAt) || 0) + 1),
        deviceId: String(session?.discordId || 'admin').slice(0, 120)
      };
      next.cells[charName][write.taskName] = cell;
      responseCells[write.taskName] = cell;
      if (write.timing) {
        if (!next.completionTiming || typeof next.completionTiming !== 'object') next.completionTiming = {};
        if (!next.completionTiming[write.timing.weekKey] || typeof next.completionTiming[write.timing.weekKey] !== 'object') next.completionTiming[write.timing.weekKey] = {};
        if (!next.completionTiming[write.timing.weekKey][charName] || typeof next.completionTiming[write.timing.weekKey][charName] !== 'object') next.completionTiming[write.timing.weekKey][charName] = {};
        const oldTiming = obj(next.completionTiming[write.timing.weekKey][charName])[write.taskName];
        const incomingTiming = { state: write.timing.state, at: write.timing.at, ownerKey: write.timing.ownerKey };
        if (!oldTiming || Number(incomingTiming.at) >= (Number(oldTiming.at) || 0)) next.completionTiming[write.timing.weekKey][charName][write.taskName] = incomingTiming;
      }
    }

    // Reuse the same server-side registration/ownership guard as the full-record API.
    // This request can modify only `charName`; regular members cannot patch another
    // member's character even if they handcraft the request.
    const violation = registrationWriteViolation(previous, next, session);
    if (violation) return jsonResponse({ error: violation, message: violation }, 403);

    next.updatedAt = Math.max(now, (Number(current.updated_at) || 0) + 1);
    const packed = encodePantheonCompactRecord(next);
    let result;
    try {
      result = await env.PANTHEON_DB.prepare(`
        UPDATE data_records SET record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(JSON.stringify(packed), next.updatedAt, targetId, current.record_json).run();
    } catch (error) {
      return jsonResponse({ message: String(error?.message || error) }, 413);
    }
    if (Number(result?.meta?.changes) > 0) {
      return jsonResponse({ metadata: { id: requestedId, updatedAt: next.updatedAt, character: charName }, cells: responseCells });
    }
  }
  return jsonResponse({ error: 'This character changed repeatedly while saving. The edit is retained locally; retrying is safe.', message: 'Concurrent character updates detected.' }, 409);
}
