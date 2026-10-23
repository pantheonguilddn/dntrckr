import { getRecord, jsonResponse, resolveRecordId, storeRecord } from '../../../_utils/auth.js';

export async function onRequestGet({ params, env }) {
  const requestedId = String(params.id || '');
  const row = await getRecord(env, requestedId);
  if (!row) return jsonResponse({ message: 'Record not found.' }, 404);
  try { return jsonResponse({ metadata: { id: requestedId, name: row.name, private: true, updatedAt: row.updated_at }, record: JSON.parse(row.record_json) }); }
  catch (_) { return jsonResponse({ message: 'Stored record is corrupt.' }, 500); }
}

export async function onRequestPut({ params, request, env }) {
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  const current = await env.PANTHEON_DB.prepare('SELECT id, name FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
  if (!current) return jsonResponse({ message: 'Record not found.' }, 404);
  let record;
  try { record = await request.json(); } catch (_) { return jsonResponse({ message: 'Invalid JSON body.' }, 400); }
  try {
    await storeRecord(env, targetId, record, current.name || 'Pantheon record');
    return jsonResponse({ metadata: { id: requestedId, name: current.name, private: true }, record });
  } catch (error) {
    return jsonResponse({ message: String(error?.message || error) }, 413);
  }
}
