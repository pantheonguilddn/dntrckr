import { jsonResponse, requireAdmin } from '../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../_utils/compact.js';
import { repairBootstrapAdminOwnerLinks, resolveDiscordOwnerMember } from '../../../_utils/registration-guard.js';
import {
  bumpCharacterStorageRevision,
  characterKey,
  getCharacterStorageState,
  syncCharacterIndexes
} from '../../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const arr = value => Array.isArray(value) ? value : [];
const cleanName = value => String(value || '').normalize('NFKC').trim().slice(0, 60);
const ownerIdOf = member => String(member?.id || member?.name || '').trim().slice(0, 120);
const labelKey = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();

function memberCharacters(member, trackerRosterKeys = new Set()) {
  const profiles = new Map();
  for (const profile of arr(member?.characterProfiles)) {
    const name = cleanName(profile?.name || profile?.ign).slice(0, 40);
    if (name) profiles.set(characterKey(name), profile);
  }
  const names = new Map();
  for (const raw of arr(member?.characters)) {
    const name = cleanName(typeof raw === 'object' ? (raw?.name || raw?.ign) : raw).slice(0, 40);
    if (name) names.set(characterKey(name), name);
  }
  for (const [key, profile] of profiles) {
    const name = cleanName(profile?.name || profile?.ign).slice(0, 40);
    if (name) names.set(key, name);
  }
  return [...names.entries()].filter(([key, name]) => key && name).map(([key, name]) => ({
    characterKey: key,
    name,
    trackerEnabled: profiles.get(key)?.trackerEnabled === true || trackerRosterKeys.has(key),
    job: String(profiles.get(key)?.job || '').slice(0, 40),
    isMain: profiles.get(key)?.isMain === true
  }));
}

async function readMainRecord(env) {
  const row = await env.PANTHEON_DB.prepare(
    'SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1'
  ).bind(MAIN_ID).first();
  if (!row) throw new Error('The shared main Tracker record does not exist.');
  let record;
  try { record = decodePantheonCompactRecord(JSON.parse(row.record_json)); }
  catch (_) { throw new Error('The shared main Tracker record is corrupt; no ownership changes were made.'); }
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('The shared main Tracker has an invalid structure.');
  record.settings = obj(record.settings);
  return { row, record };
}

async function buildAudit(env, record, session) {
  const [ownerResult, allowlistResult] = await Promise.all([
    env.PANTHEON_DB.prepare(`
      SELECT character_key, character_name, member_id, owner_name, owner_discord_id,
             tracker_enabled, active, updated_at
      FROM character_owners
      ORDER BY owner_name COLLATE NOCASE, character_name COLLATE NOCASE
    `).all(),
    env.PANTHEON_DB.prepare(`
      SELECT discord_id, label, role, enabled
      FROM allowed_users
      ORDER BY label COLLATE NOCASE, discord_id
    `).all()
  ]);

  const memberDirectory = arr(record?.settings?.memberDirectory);
  const trackerRosterKeys = new Set(arr(record?.settings?.rosters).flatMap(roster => arr(roster?.characters).map(characterKey)).filter(Boolean));
  const enabledAccounts = (allowlistResult.results || []).filter(row => Number(row.enabled) === 1).map(row => ({
    discordId: String(row.discord_id || ''),
    label: String(row.label || ''),
    role: String(row.role || 'member')
  }));
  const allAccountsById = new Map((allowlistResult.results || []).map(row => [String(row.discord_id || ''), row]));
  const ownerRows = new Map((ownerResult.results || []).map(row => [String(row.character_key || ''), row]));

  const idOwners = new Map();
  const characterOwners = new Map();
  const parsedMembers = memberDirectory.map(member => {
    const memberId = ownerIdOf(member);
    const name = cleanName(member?.name);
    const discordId = String(member?.profileConfirmedDiscordId || '').trim();
    const characters = memberCharacters(member, trackerRosterKeys);
    if (discordId) {
      if (!idOwners.has(discordId)) idOwners.set(discordId, []);
      idOwners.get(discordId).push({ memberId, name });
    }
    for (const character of characters) {
      if (!characterOwners.has(character.characterKey)) characterOwners.set(character.characterKey, []);
      characterOwners.get(character.characterKey).push({ memberId, name, characterName: character.name });
    }
    return { memberId, name, discordId, characters,
      isBootstrapPersonalOwner: member?.isBootstrapPersonalOwner === true,
      ledgerAccess: member?.ledgerAccess === true
    };
  }).filter(member => member.memberId && member.name);

  const members = parsedMembers.map(member => {
    const linkedOwners = member.discordId ? (idOwners.get(member.discordId) || []) : [];
    const allowlisted = member.discordId ? allAccountsById.get(member.discordId) : null;
    const duplicateIdentity = linkedOwners.length > 1;
    const duplicateCharacterNames = member.characters
      .filter(character => (characterOwners.get(character.characterKey) || []).length > 1)
      .map(character => ({
        name: character.name,
        owners: (characterOwners.get(character.characterKey) || []).map(item => ({ memberId:item.memberId, name:item.name }))
      }));
    const indexProblems = member.characters.filter(character => {
      const row = ownerRows.get(character.characterKey);
      return !row || Number(row.active) !== 1 || String(row.member_id || '') !== member.memberId || String(row.owner_discord_id || '') !== member.discordId;
    }).map(character => character.name);

    let issueCode = 'linked';
    let issueLabel = 'Linked';
    if (!member.characters.length) {
      issueCode = 'no-characters';
      issueLabel = 'No characters registered';
    } else if (!member.discordId) {
      issueCode = 'missing-discord-confirmation';
      issueLabel = 'No confirmed Discord account';
    } else if (duplicateIdentity) {
      issueCode = 'duplicate-discord-link';
      issueLabel = `Discord ID linked to ${linkedOwners.length} roster owners`;
    } else if (String(env?.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim() &&
               member.discordId &&
               member.discordId === String(env.BOOTSTRAP_ADMIN_DISCORD_ID).trim() &&
               !member.isBootstrapPersonalOwner &&
               labelKey(member.name) !== labelKey(String(env?.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho'))) {
      issueCode = 'bootstrap-admin-id-on-wrong-owner';
      issueLabel = `Administrator identity is linked to the wrong owner (expected ${String(env?.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho').trim()})`;
    } else if (!member.isBootstrapPersonalOwner &&
               labelKey(member.name) === labelKey(String(env?.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho')) &&
               String(env?.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim() &&
               member.discordId &&
               member.discordId !== String(env.BOOTSTRAP_ADMIN_DISCORD_ID).trim()) {
      issueCode = 'bootstrap-personal-owner-mismatch';
      issueLabel = 'Configured personal owner is linked to a different Discord account';
    } else if (!allowlisted || Number(allowlisted.enabled) !== 1) {
      issueCode = 'discord-account-not-enabled';
      issueLabel = 'Discord account is not enabled in the allowlist';
    } else if (duplicateCharacterNames.length) {
      issueCode = 'duplicate-character-ign';
      issueLabel = 'Character IGN appears under multiple owners';
    } else if (indexProblems.length) {
      issueCode = 'owner-index-out-of-date';
      issueLabel = 'Ownership index needs refreshing';
    }

    const suggested = enabledAccounts.filter(account => labelKey(account.label) === labelKey(member.name));
    const personalOwnerName = String(env?.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho').trim();
    const bootstrapAdminId = String(env?.BOOTSTRAP_ADMIN_DISCORD_ID || '');
    const linkOptions = enabledAccounts.filter(account => {
      const linkedElsewhere = (idOwners.get(account.discordId) || []).some(owner => owner.memberId !== member.memberId);
      if (linkedElsewhere) return false;
      if (bootstrapAdminId && account.discordId === bootstrapAdminId && !member.isBootstrapPersonalOwner && member.discordId !== bootstrapAdminId && labelKey(member.name) !== labelKey(personalOwnerName)) return false;
      return true;
    });

    return {
      memberId: member.memberId,
      memberName: member.name,
      discordId: member.discordId,
      discordLabel: String(allowlisted?.label || ''),
      discordRole: String(allowlisted?.role || ''),
      discordAccountEnabled: Number(allowlisted?.enabled) === 1,
      linkedRosterOwners: linkedOwners,
      issueCode,
      issueLabel,
      suggestedDiscordId: suggested.length === 1 && linkOptions.some(option => option.discordId === suggested[0].discordId) ? suggested[0].discordId : '',
      linkOptions,
      duplicateCharacterNames,
      indexProblems,
      isBootstrapPersonalOwner: member.isBootstrapPersonalOwner === true || (
        !!String(env?.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim() &&
        member.discordId === String(env.BOOTSTRAP_ADMIN_DISCORD_ID).trim() &&
        labelKey(member.name) === labelKey(String(env?.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho'))
      ),
      characters: member.characters,
      characterCount: member.characters.length,
      trackerCharacterCount: member.characters.filter(character => character.trackerEnabled).length
    };
  });

  const activeRows = (ownerResult.results || []).filter(row => Number(row.active) === 1);
  const orphanRows = (ownerResult.results || []).filter(row => Number(row.active) !== 1 && !String(row.member_id || '').trim());
  const linkedCharacterCount = activeRows.filter(row => {
    const member = parsedMembers.find(item => item.memberId === String(row.member_id || ''));
    const discordId = String(row.owner_discord_id || '');
    const accounts = idOwners.get(discordId) || [];
    const allowlisted = allAccountsById.get(discordId);
    const duplicateIgn = (characterOwners.get(String(row.character_key || '')) || []).length > 1;
    return !!discordId && !!member && member.discordId === discordId && accounts.length === 1 &&
      !!allowlisted && Number(allowlisted.enabled) === 1 && !duplicateIgn;
  }).length;
  const unlinkedCharacterCount = Math.max(0, activeRows.length - linkedCharacterCount);
  const duplicateDiscordIds = [...idOwners.entries()].filter(([, owners]) => owners.length > 1).map(([discordId, owners]) => ({ discordId, owners }));
  const duplicateCharacterNames = [...characterOwners.entries()].filter(([, owners]) => owners.length > 1).map(([characterKey, owners]) => ({
    characterKey,
    characterName: owners[0]?.characterName || characterKey,
    owners
  }));
  const ownerIndexOrphans = activeRows.filter(row => !parsedMembers.some(member => member.memberId === String(row.member_id || '') && member.characters.some(character => character.characterKey === String(row.character_key || '')))).map(row => ({
    characterName: String(row.character_name || ''),
    memberId: String(row.member_id || ''),
    ownerName: String(row.owner_name || '')
  }));

  return {
    migrationComplete: true,
    counts: {
      memberCount: members.length,
      characterCount: activeRows.length,
      linkedCharacters: linkedCharacterCount,
      unlinkedCharacterCount,
      ownersMissingDiscord: members.filter(member => member.issueCode === 'missing-discord-confirmation').length,
      ownersWithDuplicateDiscord: members.filter(member => member.issueCode === 'duplicate-discord-link').length,
      ownersWithUnapprovedDiscord: members.filter(member => member.issueCode === 'discord-account-not-enabled').length,
      ownersWithDuplicateCharacterNames: members.filter(member => member.duplicateCharacterNames.length > 0).length,
      ownersWithStaleIndex: members.filter(member => member.indexProblems.length > 0).length,
      bootstrapIdentityOnWrongOwner: members.filter(member => member.issueCode === 'bootstrap-admin-id-on-wrong-owner').length,
      bootstrapPersonalOwnerMismatch: members.filter(member => member.issueCode === 'bootstrap-personal-owner-mismatch').length,
      duplicateDiscordIdCount: duplicateDiscordIds.length,
      duplicateCharacterNameCount: duplicateCharacterNames.length,
      legacyOrphanCharacterCount: orphanRows.length,
      ownerIndexOrphanCount: ownerIndexOrphans.length
    },
    members,
    duplicateDiscordIds,
    duplicateCharacterNames,
    legacyOrphans: orphanRows.map(row => ({ characterName:String(row.character_name || ''), cellsPreserved:true })),
    ownerIndexOrphans,
    enabledAccounts,
    bootstrapPersonalOwnerName: String(env?.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho').trim(),
    bootstrapDiscordId: String(env?.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim()
  };
}

async function commitMemberDirectoryChange(env, session, mutate, action, details = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { row, record } = await readMainRecord(env);
    const members = arr(record.settings.memberDirectory);
    const matches = details.memberId ? members.filter(member => ownerIdOf(member) === String(details.memberId)) : [];
    if (details.memberId && matches.length !== 1) throw new Error(matches.length ? 'The selected member ID is duplicated in Member Roster. Resolve that duplicate first.' : 'The selected Member Roster owner no longer exists. Refresh the audit and try again.');
    const changed = mutate(record, matches[0] || null, members);
    if (!changed) return { record, updatedAt:Number(row.updated_at) || Date.now(), changed:false };
    const now = Date.now();
    record.settings.memberDirectory = members;
    record.settings.memberDirectoryUpdatedAt = now;
    record.settings.memberDirectoryUpdatedBy = String(session.discordId || 'admin');
    record.settings.memberRosterMasterVersion = (Number(record.settings.memberRosterMasterVersion) || 0) + 1;
    record.updatedAt = now;
    const packed = JSON.stringify(encodePantheonCompactRecord(record));
    const saved = await env.PANTHEON_DB.prepare(`
      UPDATE data_records SET record_json = ?, updated_at = ?
      WHERE id = ? AND record_json = ?
    `).bind(packed, now, MAIN_ID, String(row.record_json)).run();
    if (Number(saved?.meta?.changes) === 1) {
      try {
        await syncCharacterIndexes(env, record, now);
        await bumpCharacterStorageRevision(env, now);
      } catch (error) {
        throw new Error(`The Member Roster link was saved, but its character ownership index needs refreshing: ${String(error?.message || error).slice(0,180)}`);
      }
      await env.PANTHEON_DB.prepare(`
        INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json)
        VALUES (?, ?, '', ?, ?)
      `).bind(String(session.discordId || ''), action, now, JSON.stringify(details)).run();
      return { record, updatedAt:now, changed:true };
    }
  }
  throw new Error('The Member Roster changed repeatedly while saving. No ownership link was changed; refresh the audit and retry.');
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    const state = await getCharacterStorageState(context.env);
    if (Number(state?.migration_complete) !== 1) return jsonResponse({ error:'Player storage migration is not complete yet. The existing Tracker remains available.' }, 409);
    const { record } = await readMainRecord(context.env);
    const audit = await buildAudit(context.env, record, context.data.session);
    return jsonResponse({ ok:true, ...audit, storageRevision:Number(state?.revision) || 0 });
  } catch (error) {
    return jsonResponse({ error:`Could not audit player ownership: ${String(error?.message || error).slice(0,300)}` }, 500);
  }
}

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (context.request.headers.get('X-Pantheon-Admin-Mode') !== '1') {
    return jsonResponse({ error:'Turn on Admin View before changing player ownership links.' }, 403);
  }
  const state = await getCharacterStorageState(context.env).catch(() => null);
  if (Number(state?.migration_complete) !== 1) return jsonResponse({ error:'Player storage is not ready. No ownership changes were made.' }, 409);
  let body;
  try { body = await context.request.json(); } catch (_) { return jsonResponse({ error:'Expected a JSON request body.' }, 400); }
  if (body?.confirm !== true) return jsonResponse({ error:'Explicit confirmation is required.' }, 400);
  const action = String(body.action || 'link');
  const memberId = String(body.memberId || '').trim().slice(0,120);
  const discordId = String(body.discordId || '').trim();
  const session = context.data.session;

  try {
    if (action === 'refresh-index') {
      const { record } = await readMainRecord(context.env);
      const stats = await syncCharacterIndexes(context.env, record, Date.now(), true);
      await bumpCharacterStorageRevision(context.env, Date.now());
      return jsonResponse({ ok:true, action, ...stats });
    }

    if (action === 'repair-bootstrap-admin-links') {
      if (session.isBootstrapAdmin !== true) return jsonResponse({ error:'Only the configured bootstrap administrator can repair its personal-owner identity link.' }, 403);
      const result = await commitMemberDirectoryChange(context.env, session, (record, _member, members) => {
        const personalName = String(context.env.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || session.personalOwnerName || 'Cho').trim();
        const marked = members.filter(member => member.isBootstrapPersonalOwner === true);
        const byConfiguredName = members.filter(member => labelKey(member.name) === labelKey(personalName));
        const resolvedById = resolveDiscordOwnerMember(session, members);
        const owner = marked.length === 1
          ? marked[0]
          : marked.length > 1
            ? null
            : byConfiguredName.length === 1 && (!resolvedById || ownerIdOf(resolvedById) === ownerIdOf(byConfiguredName[0]))
              ? byConfiguredName[0]
              : null;
        if (!owner) throw new Error(`The bootstrap personal owner could not be resolved uniquely. Check the configured first-link name (${personalName}) and ownership audit.`);
        const currentId = String(owner.profileConfirmedDiscordId || '').trim();
        if (currentId && currentId !== String(session.discordId)) throw new Error('The bootstrap personal owner is already linked to a different Discord account. No identity was changed.');
        const changed = repairBootstrapAdminOwnerLinks(record, session);
        if (String(owner.profileConfirmedDiscordId || '').trim() !== String(session.discordId) || owner.isBootstrapPersonalOwner !== true) throw new Error('The bootstrap Discord identity could not be safely assigned to the personal owner.');
        return changed;
      }, 'repair-bootstrap-admin-owner-links', { personalOwnerName:String(context.env.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || session.personalOwnerName || 'Cho') });
      return jsonResponse({ ok:true, action, changed:result.changed });
    }

    if (!memberId) return jsonResponse({ error:'A Member Roster owner is required.' }, 400);
    if (action === 'clear-link') {
      const expectedDiscordId = String(body.expectedDiscordId || '').trim();
      const result = await commitMemberDirectoryChange(context.env, session, (record, member) => {
        const currentId = String(member.profileConfirmedDiscordId || '').trim();
        if (!currentId) return false;
        if (expectedDiscordId && currentId !== expectedDiscordId) {
          throw new Error('This member’s Discord link changed since the audit was loaded. Refresh the ownership audit before making another change.');
        }
        const bootstrapId = String(context.env.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim();
        const bootstrapPersonalOwner = String(context.env.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || 'Cho').trim();
        const isBootstrapIdentity = !!bootstrapId && currentId === bootstrapId;
        const isConfiguredPersonalOwner = member.isBootstrapPersonalOwner === true || labelKey(member.name) === labelKey(bootstrapPersonalOwner);
        if (member.isBootstrapPersonalOwner === true || (isBootstrapIdentity && isConfiguredPersonalOwner)) {
          throw new Error('The bootstrap administrator personal-owner link cannot be cleared. Keep it on the configured personal roster.');
        }
        // An administrator may deliberately unlink any other member, not only duplicates.
        // Character records and progress remain attached to their stable Member Roster ID.
        member.profileConfirmedDiscordId = '';
        member.profileConfirmedAt = 0;
        return true;
      }, 'clear-member-roster-owner-discord-link', { memberId, expectedDiscordId });
      return jsonResponse({ ok:true, action, changed:result.changed });
    }

    if (action === 'link') {
      if (!/^\d{17,20}$/.test(discordId)) return jsonResponse({ error:'Choose an enabled Discord account from the allowlist.' }, 400);
      const allowed = await context.env.PANTHEON_DB.prepare('SELECT discord_id, label, role, enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
      if (!allowed || Number(allowed.enabled) !== 1) return jsonResponse({ error:'That Discord account is not enabled in the Pantheon allowlist. Add or enable it first.' }, 400);
      const bootstrapId = String(context.env.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim();
      const personalOwner = String(context.env.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || session.personalOwnerName || 'Cho');
      if (bootstrapId && discordId === bootstrapId) {
        const { record } = await readMainRecord(context.env);
        const owner = arr(record.settings.memberDirectory).find(item => ownerIdOf(item) === memberId);
        if (!owner || !(owner.isBootstrapPersonalOwner === true || labelKey(owner.name) === labelKey(personalOwner))) return jsonResponse({ error:`The bootstrap administrator Discord account must remain linked to its configured personal owner (${personalOwner}).` }, 403);
      }
      const result = await commitMemberDirectoryChange(context.env, session, (record, member, members) => {
        const bootstrapIdForLink = String(context.env.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim();
        const configuredPersonalOwnerName = String(context.env.BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME || session.personalOwnerName || 'Cho').trim();
        const isConfiguredPersonalOwner = member.isBootstrapPersonalOwner === true || labelKey(member.name) === labelKey(configuredPersonalOwnerName);
        if (isConfiguredPersonalOwner && bootstrapIdForLink && discordId !== bootstrapIdForLink) {
          throw new Error('The configured bootstrap personal owner must remain linked to the bootstrap administrator Discord account.');
        }
        const existing = members.filter(other => ownerIdOf(other) !== memberId && String(other.profileConfirmedDiscordId || '').trim() === discordId);
        if (existing.length) {
          throw new Error(`That Discord account is already linked to ${existing.map(item => cleanName(item.name)).join(', ')}. Clear the duplicate link on the incorrect roster entry first.`);
        }
        if (String(member.profileConfirmedDiscordId || '').trim() === discordId) return false;
        member.profileConfirmedDiscordId = discordId;
        member.profileConfirmedAt = Date.now();
        if (discordId === String(context.env.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim()) member.isBootstrapPersonalOwner = true;
        return true;
      }, 'link-member-roster-owner-discord-id', { memberId, discordId, accountLabel:String(allowed.label || '') });
      return jsonResponse({ ok:true, action, changed:result.changed, memberId, discordId });
    }

    return jsonResponse({ error:'Unknown ownership audit action.' }, 400);
  } catch (error) {
    return jsonResponse({ error:String(error?.message || error).slice(0,300) }, 409);
  }
}
