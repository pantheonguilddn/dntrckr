import { getRecord, jsonResponse, resolveRecordId } from '../../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../../_utils/compact.js';
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
