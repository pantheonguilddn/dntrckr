import { jsonResponse } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';
import { resolveDiscordOwnerMember } from '../../_utils/registration-guard.js';
import { getCharacterStorageState, isCharacterStorageMigrationBusy, syncCharacterIndexes, bumpCharacterStorageRevision } from '../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const cleanNameKey = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
const compactNameKey = value => cleanNameKey(value).replace(/[\s._-]+/g, '');
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);

export async function onRequestPut(context) {
  const session = context.data?.session;
  if (!session?.discordId) return jsonResponse({ error:'Sign in with your approved Discord account first.' }, 401);
  if (await isCharacterStorageMigrationBusy(context.env)) {
    return jsonResponse({ error:'Player storage is being initialized. Your name was not changed; try again when setup finishes.', retryable:true }, 503);
  }

  let body;
  try { body = await context.request.json(); }
  catch (_) { return jsonResponse({ error:'Expected a JSON request body.' }, 400); }
  const displayName = String(body?.displayName || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!displayName) return jsonResponse({ error:'Your Pantheon display name cannot be empty.' }, 400);
  if ([...displayName].length > 30) return jsonResponse({ error:'Your Pantheon display name must be 30 characters or fewer.' }, 400);
  if (displayName.includes('<') || displayName.includes('>')) return jsonResponse({ error:'Angle brackets are not allowed in a display name.' }, 400);

  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const row = await context.env.PANTHEON_DB.prepare('SELECT id, name, record_json FROM data_records WHERE id = ? LIMIT 1').bind(MAIN_ID).first();
      if (!row) return jsonResponse({ error:'The shared Pantheon roster has not been initialized.' }, 404);
      let record;
      try { record = decodePantheonCompactRecord(JSON.parse(row.record_json)); }
      catch (_) { return jsonResponse({ error:'The shared Pantheon roster could not be read safely. No changes were made.' }, 500); }
      if (!isObject(record) || !isObject(record.settings)) return jsonResponse({ error:'The shared Pantheon roster has an invalid structure.' }, 500);

      const members = Array.isArray(record.settings.memberDirectory) ? record.settings.memberDirectory : [];
      const member = resolveDiscordOwnerMember(session, members);
      if (!member) return jsonResponse({ error:'Your Discord account is not linked to one unique Pantheon roster. Ask an administrator to resolve the link first.' }, 409);
      const memberId = String(member.id || '').trim();
      if (!memberId || members.filter(item => String(item?.id || '').trim() === memberId).length !== 1) {
        return jsonResponse({ error:'Your Pantheon roster ID is ambiguous. Ask an administrator to resolve the duplicate before renaming.' }, 409);
      }
      const discordId = String(session.discordId).trim();
      const duplicateLinks = members.filter(item => item !== member && String(item?.profileConfirmedDiscordId || '').trim() === discordId);
      if (duplicateLinks.length) return jsonResponse({ error:'Your Discord account is linked to more than one roster. Ask an administrator to resolve the duplicate before renaming.' }, 409);

      const targetKey = cleanNameKey(displayName);
      const targetCompactKey = compactNameKey(displayName);
      const collision = members.find(item => item !== member && (cleanNameKey(item?.name) === targetKey || compactNameKey(item?.name) === targetCompactKey));
      if (collision) return jsonResponse({ error:`The Pantheon name “${displayName}” is already in use or too similar to another member's name. Choose another name.` }, 409);

      const oldName = String(member.name || '').trim();
      const oldKey = cleanNameKey(oldName);
      const oldCompactName = oldKey.replace(/[^a-z0-9]/g, '');
      const targetCompactName = targetKey.replace(/[^a-z0-9]/g, '');
      const ledgerOwnerNames = ['cho','bio','cheean'];
      if (ledgerOwnerNames.includes(targetCompactName) && !ledgerOwnerNames.includes(oldCompactName) && member.ledgerAccess !== true) {
        return jsonResponse({ error:'That Pantheon name is reserved for an existing Ledger owner. Choose another display name.' }, 409);
      }
      if (session.isBootstrapAdmin === true && member.isBootstrapPersonalOwner !== true && cleanNameKey(member.name) !== cleanNameKey(session.personalOwnerName)) {
        return jsonResponse({ error:'Your bootstrap administrator account is linked to a roster that does not match its configured personal owner. Ask an administrator to resolve the ownership link before renaming.' }, 409);
      }
      const trackerRosterId = String(member.trackerRosterId || '').trim();
      const rosters = Array.isArray(record.settings.rosters) ? record.settings.rosters : [];
      let roster = trackerRosterId ? rosters.find(item => String(item?.id || '') === trackerRosterId) : null;
      if (!roster && oldKey) {
        const candidates = rosters.filter(item => cleanNameKey(item?.name) === oldKey);
        if (candidates.length > 1) return jsonResponse({ error:'Your Tracker roster link is ambiguous. Ask an administrator to repair it before renaming.' }, 409);
        roster = candidates[0] || null;
      }
      const rosterCollision = roster && rosters.find(item => item !== roster && compactNameKey(item?.name) === targetCompactKey);
      if (rosterCollision) return jsonResponse({ error:`The Tracker name “${displayName}” is already used by another roster. Choose another name.` }, 409);

      const unchanged = oldKey === targetKey;
      const alreadyLinked = String(member.profileConfirmedDiscordId || '').trim() === discordId;
      if (unchanged && alreadyLinked) {
        return jsonResponse({ ok:true, unchanged:true, memberId, displayName:oldName, trackerRosterId, updatedAt:Number(row.updated_at) || 0, memberRosterMasterVersion:Number(record.settings.memberRosterMasterVersion) || 0 });
      }

      const now = Date.now();
      member.name = displayName;
      // Preserve existing special Ledger access when one of its original owner labels
      // is renamed. This is set only by this authenticated endpoint and cannot be
      // self-assigned through ordinary roster synchronization.
      if (['cho','bio','cheean'].includes(cleanNameKey(oldName).replace(/[^a-z0-9]/g, ''))) member.ledgerAccess = true;
      if (session.isBootstrapAdmin === true) member.isBootstrapPersonalOwner = true;
      // Confirm the stable owner link on the first successful self-service action.
      // Do not change or transfer an already-confirmed link to another Discord account.
      const existingDiscordId = String(member.profileConfirmedDiscordId || '').trim();
      if (existingDiscordId && existingDiscordId !== discordId) {
        return jsonResponse({ error:'This Pantheon roster is already linked to another Discord account.' }, 403);
      }
      member.profileConfirmedDiscordId = discordId;
      member.profileConfirmedAt = Number(member.profileConfirmedAt) || now;
      if (roster) roster.name = displayName;
      record.settings.memberDirectory = members;
      record.settings.rosters = rosters;
      record.settings.memberDirectoryUpdatedAt = now;
      record.settings.memberDirectoryUpdatedBy = discordId;
      record.settings.memberRosterMasterVersion = (Number(record.settings.memberRosterMasterVersion) || 0) + (unchanged ? 0 : 1);
      if (roster) {
        record.settings.rosterUpdatedAt = now;
        record.settings.rosterUpdatedBy = discordId;
      }
      record.updatedAt = now;

      if (await isCharacterStorageMigrationBusy(context.env)) {
        return jsonResponse({ error:'Player storage initialization started before the name could be saved. No changes were made; try again when setup finishes.', retryable:true }, 503);
      }
      const packed = JSON.stringify(encodePantheonCompactRecord(record));
      const saved = await context.env.PANTHEON_DB.prepare(`
        UPDATE data_records SET record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(packed, now, MAIN_ID, String(row.record_json)).run();
      if (Number(saved?.meta?.changes) !== 1) continue;

      let indexWarning = '';
      try {
        const storageState = await getCharacterStorageState(context.env);
        if (Number(storageState?.migration_complete) === 1) {
          await syncCharacterIndexes(context.env, record, now);
          await bumpCharacterStorageRevision(context.env, now);
        }
      } catch (error) {
        indexWarning = String(error?.message || error).slice(0,180);
      }
      return jsonResponse({
        ok:true,
        memberId,
        displayName,
        trackerRosterId: roster ? String(roster.id || trackerRosterId) : trackerRosterId,
        updatedAt:now,
        memberRosterMasterVersion:Number(record.settings.memberRosterMasterVersion) || 0,
        indexWarning
      });
    }
    return jsonResponse({ error:'The shared roster changed repeatedly while saving. Your name was not changed; retry once the current sync finishes.' }, 409);
  } catch (error) {
    return jsonResponse({ error:`Could not update your Pantheon name: ${String(error?.message || error).slice(0,260)}` }, 500);
  }
}
