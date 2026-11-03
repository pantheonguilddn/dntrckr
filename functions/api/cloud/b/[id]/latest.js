import { getRecord, jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../../_utils/compact.js';
import { hydrateCharacterProgress } from '../../../../_utils/character-storage.js';
import { denyNonAdminRevisionJournalAccess } from '../../../../_utils/admin-tool-access.js';
import { resolveDiscordOwnerMember } from '../../../../_utils/registration-guard.js';

const MAIN_ID = 'pantheon-main';
const LEDGER_OWNER_NAMES = new Set(['bio', 'cheean', 'cho']);
function normalizeOwner(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }
function hasLedgerAccess(session, record) {
  if (!session?.discordId) return false;
  const candidates = [session.label, session.username].map(normalizeOwner).filter(Boolean);
  const members = Array.isArray(record?.settings?.memberDirectory) ? record.settings.memberDirectory : [];
  const confirmedOwner = resolveDiscordOwnerMember(session, members);
  if (confirmedOwner && (confirmedOwner.ledgerAccess === true || LEDGER_OWNER_NAMES.has(normalizeOwner(confirmedOwner.name)))) return true;
  for (const candidate of candidates) {
    if (!LEDGER_OWNER_NAMES.has(candidate)) continue;
    const matchingMember = members.find(member => normalizeOwner(member?.name) === candidate);
    if (matchingMember?.profileConfirmedDiscordId && String(matchingMember.profileConfirmedDiscordId) !== String(session.discordId)) continue;
    return true;
  }
  return false;
}
function redactLedgerRecord(decoded) {
  if (!decoded || typeof decoded !== 'object') return decoded;
  const safe = { ...decoded, scholarship: {} };
  return encodePantheonCompactRecord(safe);
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
    let decoded = decodePantheonCompactRecord(packed);
    if (resolvedId === MAIN_ID) decoded = await hydrateCharacterProgress(env, decoded);
    const characterStorageUpdatedAt = Number(decoded?.__pantheonCharacterStorageUpdatedAt) || 0;
    const characterStorageRevision = Number(decoded?.__pantheonCharacterStorageRevision) || 0;
    const session = context.data?.session;
    const responseRecord = resolvedId === MAIN_ID
      ? (hasLedgerAccess(session, decoded) ? encodePantheonCompactRecord(decoded) : redactLedgerRecord(decoded))
      : packed;
    return jsonResponse({ metadata: { id: requestedId, name: row.name, private: true, updatedAt: row.updated_at, recordUpdatedAt:Number(row.updated_at)||0, characterStorageUpdatedAt, characterStorageRevision }, record: responseRecord });
  } catch (_) { return jsonResponse({ message: 'Stored record is corrupt.' }, 500); }
}
