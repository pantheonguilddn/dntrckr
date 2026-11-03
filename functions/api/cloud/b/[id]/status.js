import { jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { denyNonAdminRevisionJournalAccess } from '../../../../_utils/admin-tool-access.js';
import { getCharacterStorageState } from '../../../../_utils/character-storage.js';

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
  const recordUpdatedAt = Number(row.updated_at) || 0;
  let characterStorageUpdatedAt = 0;
  let characterStorageRevision = 0;
  let characterStorageReady = false;
  let characterStorageMigrating = false;
  if (targetId === 'pantheon-main') {
    try {
      const storage = await getCharacterStorageState(env);
      characterStorageReady = Number(storage?.migration_complete) === 1;
      characterStorageMigrating = Number(storage?.migration_in_progress) === 1 && Number(storage?.migration_lock_until) > Date.now();
      if (characterStorageReady) { characterStorageUpdatedAt = Number(storage.updated_at) || 0; characterStorageRevision = Number(storage.revision) || 0; }
    } catch (_) { /* Legacy status remains readable until the additive migration is installed. */ }
  }
  const updatedAt = Math.max(recordUpdatedAt, characterStorageUpdatedAt);
  return jsonResponse({ metadata: { id: requestedId, updatedAt, recordUpdatedAt, characterStorageUpdatedAt, characterStorageRevision, serverTime: Date.now(), characterStorageReady, characterStorageMigrating } });
}
