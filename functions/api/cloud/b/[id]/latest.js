import { getRecord, jsonResponse } from '../../../../_utils/auth.js';
import { denyNonAdminRevisionJournalAccess } from '../../../../_utils/admin-tool-access.js';

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
