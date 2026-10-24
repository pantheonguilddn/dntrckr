import { getRecord, jsonResponse, resolveRecordId } from './auth.js';
import { decodePantheonCompactRecord } from './compact.js';

/** Deny member access to the separately stored Version History journal. */
export async function denyNonAdminRevisionJournalAccess(context, requestedId) {
  const session = context.data?.session;
  if (session?.role === 'admin') return null;
  const env = context.env;
  try {
    const resolvedRequested = await resolveRecordId(env, requestedId);
    const mainRow = await getRecord(env, 'pantheon-main');
    if (!mainRow) return null;
    const packed = JSON.parse(mainRow.record_json);
    const main = decodePantheonCompactRecord(packed);
    const revisionId = String(main?.settings?.versionControl?.revisionBinId || '').trim();
    if (!revisionId) return null;
    const resolvedRevision = await resolveRecordId(env, revisionId);
    if (resolvedRequested && resolvedRequested === resolvedRevision) {
      return jsonResponse({ error: 'Version History is available only to Pantheon administrators.' }, 403);
    }
  } catch (_) {
    // Do not block ordinary record reads because of a malformed/missing optional journal.
    // The main record route still has its regular authentication requirements.
  }
  return null;
}
