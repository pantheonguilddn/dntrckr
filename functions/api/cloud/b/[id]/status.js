import { jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { denyNonAdminRevisionJournalAccess } from '../../../../_utils/admin-tool-access.js';

// Lightweight revision check. Do not SELECT or transmit record_json unless the
// caller detects a changed revision and fetches /latest.
export async function onRequestGet(context) {
  const { params, env } = context;
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  if (!targetId) return jsonResponse({ message: 'Invalid record ID.' }, 400);
  // The main tracker is the normal polling target. Skip the revision-journal access
  // helper for it because that helper reads and decodes the entire main record to
  // discover the separate journal ID. Only non-main records need that restriction.
  if (targetId !== 'pantheon-main') {
    const denied = await denyNonAdminRevisionJournalAccess(context, requestedId);
    if (denied) return denied;
  }
  const row = await env.PANTHEON_DB.prepare('SELECT updated_at FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
  if (!row) return jsonResponse({ message: 'Record not found.' }, 404);
  return jsonResponse({ metadata: { id: requestedId, updatedAt: Number(row.updated_at) || 0, serverTime: Date.now() } });
}
