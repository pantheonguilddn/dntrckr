import { jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../../_utils/compact.js';
import { registrationWriteViolation } from '../../../../_utils/registration-guard.js';

const MAIN_ID = 'pantheon-main';
const CELL_STATES = new Set(['open','done','excluded','marked','reset']);
function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

// Save a single character's task cells independently from other roster characters
// and independently from whole-record settings/history synchronization.
export async function onRequestPost(context) {
  const { params, request, env, data } = context;
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  if (!targetId) return jsonResponse({ message:'Invalid record ID.' },400);
  if (targetId !== MAIN_ID) return jsonResponse({ message:'Character progress can only be saved to the main Tracker record.' },400);

  let body;
  try { body = await request.json(); } catch (_) { return jsonResponse({ message:'Invalid JSON body.' },400); }
  const character = String(body?.character || '').trim().slice(0,40);
  const edits = Array.isArray(body?.edits) ? body.edits.slice(0,100) : [];
  if (!character || !edits.length) return jsonResponse({ message:'A character and at least one task edit are required.' },400);
  const cleanEdits = [];
  const seenTasks = new Set();
  for (const raw of edits) {
    const item = obj(raw);
    const taskName = String(item.taskName || '').trim().slice(0,140);
    const state = String(item.state || 'open');
    const note = String(item.note || '').slice(0,40);
    if (!taskName || !CELL_STATES.has(state)) return jsonResponse({ message:'One or more task edits are invalid.' },400);
    if (seenTasks.has(taskName)) return jsonResponse({ message:'Duplicate task edits were submitted for the same character.' },400);
    seenTasks.add(taskName);
    cleanEdits.push({ taskName, state, note });
  }
  const timingInput = Array.isArray(body?.timing) ? body.timing.slice(0,100) : [];

  for (let attempt=1; attempt<=5; attempt++) {
    const row = await env.PANTHEON_DB.prepare('SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
    if (!row) return jsonResponse({ message:'Main Tracker record was not found.' },404);
    let previous;
    try { previous = decodePantheonCompactRecord(JSON.parse(row.record_json)); }
    catch (_) { return jsonResponse({ message:'Stored Tracker record is corrupt.' },500); }
    if (!previous || typeof previous !== 'object') return jsonResponse({ message:'Stored Tracker record is invalid.' },500);

    const configuredTasks = new Set((Array.isArray(previous.settings?.categories) ? previous.settings.categories : []).flatMap(category => Array.isArray(category?.tasks) ? category.tasks.map(String) : []));
    for (const edit of cleanEdits) if (!configuredTasks.has(edit.taskName)) return jsonResponse({ message:`Task "${edit.taskName}" is not in the current Tracker categories.` },400);

    const next = JSON.parse(JSON.stringify(previous));
    if (!next.cells || typeof next.cells !== 'object') next.cells = {};
    if (!next.cells[character] || typeof next.cells[character] !== 'object') next.cells[character] = {};
    const savedEdits = [];
    const serverTimes = new Map();
    for (const edit of cleanEdits) {
      const oldCell = obj(previous.cells?.[character]?.[edit.taskName]);
      const serverStamp = Math.max(Date.now(), (Number(oldCell.updatedAt) || 0) + 1);
      const saved = {
        state:edit.state,
        note:edit.note,
        updatedAt:serverStamp,
        deviceId:String(data?.session?.discordId || 'admin').slice(0,120)
      };
      next.cells[character][edit.taskName] = saved;
      serverTimes.set(edit.taskName,serverStamp);
      savedEdits.push({ taskName:edit.taskName, ...saved });
    }

    // Preserve the optional group-run timing evidence in the same character transaction.
    // Timing is accepted only for a task whose cell is included in this request and whose
    // saved state agrees with the timing state; the owner key is derived from the session.
    if (next.settings?.analyticsTrackingEnabled === true && data?.session?.discordId) {
      const owner = (Array.isArray(previous.settings?.memberDirectory) ? previous.settings.memberDirectory : [])
        .find(member => String(member?.profileConfirmedDiscordId || '') === String(data.session.discordId));
      const ownerKey = String(owner?.id || owner?.name || '').slice(0,120);
      const now = Date.now();
      const cutoff = now - 42 * 24 * 60 * 60 * 1000;
      const clearAt = Number(previous.settings?.analyticsHistoryClearedAt) || 0;
      if (!next.completionTiming || typeof next.completionTiming !== 'object') next.completionTiming = {};
      if (ownerKey) for (const rawTiming of timingInput) {
        const item = obj(rawTiming);
        const taskName = String(item.taskName || '').trim();
        const edit = cleanEdits.find(value => value.taskName === taskName);
        const weekKey = String(item.weekKey || '');
        const weekAt = Number(weekKey);
        if (!edit || !['done','open'].includes(item.state) || edit.state !== item.state || !Number.isFinite(weekAt) || weekAt < cutoff || weekAt > now + 24*60*60*1000) continue;
        const at = serverTimes.get(taskName) || now;
        if (at < clearAt) continue;
        if (!next.completionTiming[weekKey]) next.completionTiming[weekKey] = {};
        if (!next.completionTiming[weekKey][character]) next.completionTiming[weekKey][character] = {};
        const old = obj(next.completionTiming[weekKey][character][taskName]);
        if ((Number(old.at) || 0) > at) continue;
        next.completionTiming[weekKey][character][taskName] = { state:item.state, at, ownerKey };
      }
      const weeks = Object.keys(next.completionTiming).sort((a,b)=>Number(a)-Number(b));
      for (const week of weeks) {
        if (!Number.isFinite(Number(week)) || Number(week) < cutoff) delete next.completionTiming[week];
      }
      const kept = Object.keys(next.completionTiming).sort((a,b)=>Number(a)-Number(b)).slice(-6);
      next.completionTiming = Object.fromEntries(kept.map(key=>[key,next.completionTiming[key]]));
    }

    const adminOverride = data?.session?.role === 'admin' && request.headers.get('X-Pantheon-Admin-Mode') === '1';
    const violation = registrationWriteViolation(previous,next,data?.session,{ enforceForAdmin:!adminOverride });
    if (violation) return jsonResponse({ error:violation, message:violation },403);

    const savedAt = Math.max(Date.now(), (Number(row.updated_at) || 0) + 1);
    next.updatedAt = savedAt;
    next.syncInfo = { operationId:`cell-${String(data?.session?.discordId || 'admin')}-${savedAt}`, by:String(data?.session?.discordId || 'admin'), at:savedAt };
    const packed = encodePantheonCompactRecord(next);
    let result;
    try {
      result = await env.PANTHEON_DB.prepare(`
        UPDATE data_records SET record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(JSON.stringify(packed),savedAt,targetId,row.record_json).run();
    } catch (error) {
      return jsonResponse({ message:String(error?.message || error).slice(0,300) },500);
    }
    if (Number(result?.meta?.changes) > 0) {
      return jsonResponse({ metadata:{ id:requestedId, updatedAt:savedAt, character }, character, edits:savedEdits });
    }
  }
  return jsonResponse({ message:'This character changed repeatedly while saving. The edits remain queued on this device; they will retry.' },409);
}
