import { jsonResponse, requireAdmin, storeRecord } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';

const MAIN_ID = 'pantheon-main';
const VALID_JOBS = new Set(['Adept','Physician','Gear Master','Shooting Star','Sniper','Artillery','Wind Walker','Tempest','Light Fury','Abyss Walker','Raven','Ripper','Saint','Inquisitor','Crusader','Guardian','Spirit Dancer','Blade Dancer','Dark Summoner','Soul Eater','Saleana','Elestra','Majesty','Smasher','Gladiator','Moonlord','Barbarian','Destroyer','Dark Avenger']);
const cleanProfile = profile => ({
  name: String(profile?.name || '').trim().slice(0, 40),
  job: String(profile?.job || '').trim().slice(0, 60),
  trackerEnabled: profile?.trackerEnabled === true,
  isMain: profile?.isMain === true
});
function serializeMembers(record) {
  const settings = record?.settings || {};
  const rosters = Array.isArray(settings.rosters) ? settings.rosters : [];
  const jobs = settings.characterJobs && typeof settings.characterJobs === 'object' ? settings.characterJobs : {};
  return (Array.isArray(settings.memberDirectory) ? settings.memberDirectory : []).map(member => {
    const roster = rosters.find(item => String(item?.id || '') === String(member?.trackerRosterId || ''))
      || rosters.find(item => String(item?.name || '').trim().toLocaleLowerCase() === String(member?.name || '').trim().toLocaleLowerCase());
    const rawProfiles = Array.isArray(member?.characterProfiles) ? member.characterProfiles : [];
    const profileByName = new Map(rawProfiles.map(profile => [String(profile?.name || profile?.ign || '').trim().toLocaleLowerCase(), profile]));
    const names = Array.isArray(member?.characters) ? member.characters.map(item => String(typeof item === 'object' ? (item?.name || item?.ign || '') : item || '').trim()).filter(Boolean) : [];
    const characterNames = [...new Set([...names, ...rawProfiles.map(profile => String(profile?.name || profile?.ign || '').trim()).filter(Boolean)])];
    return {
      id: String(member?.id || ''),
      name: String(member?.name || ''),
      note: String(member?.note || ''),
      trackerRosterId: String(member?.trackerRosterId || ''),
      profileConfirmedDiscordId: String(member?.profileConfirmedDiscordId || ''),
      characterProfiles: characterNames.map(name => {
        const profile = profileByName.get(name.toLocaleLowerCase()) || {};
        const trackerEnabled = profile.trackerEnabled === true || (Array.isArray(roster?.characters) && roster.characters.some(character => String(character).toLocaleLowerCase() === name.toLocaleLowerCase()));
        return cleanProfile({ name, job: profile.job || jobs[name]?.job || '', trackerEnabled, isMain: profile.isMain === true });
      })
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
async function getDecodedMainRecord(env) {
  const row = await env.PANTHEON_DB.prepare('SELECT id, name, record_json FROM data_records WHERE id = ? LIMIT 1').bind(MAIN_ID).first();
  if (!row) return null;
  let raw;
  try { raw = JSON.parse(row.record_json); } catch (_) { throw new Error('The shared main record is corrupt.'); }
  return { row, record: decodePantheonCompactRecord(raw) };
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    const result = await getDecodedMainRecord(context.env);
    if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
    return jsonResponse({ members: serializeMembers(result.record), updatedAt: result.row.updated_at || 0 });
  } catch (error) {
    return jsonResponse({ error: String(error?.message || error).slice(0, 300) }, 500);
  }
}

export async function onRequestPut(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let body;
  try { body = await context.request.json(); } catch (_) { return jsonResponse({ error: 'Expected a JSON request body.' }, 400); }
  const memberId = String(body.memberId || '').trim();
  if (!memberId) return jsonResponse({ error: 'A member ID is required.' }, 400);
  if (!Array.isArray(body.characterProfiles) || body.characterProfiles.length > 100) return jsonResponse({ error: 'Character profiles must be an array containing no more than 100 characters.' }, 400);

  const profiles = body.characterProfiles.map(cleanProfile).filter(profile => profile.name);
  if (profiles.some(profile => !VALID_JOBS.has(profile.job))) return jsonResponse({ error: 'Every character needs a valid Class / Job.' }, 400);
  const unique = new Set();
  for (const profile of profiles) {
    const key = profile.name.toLocaleLowerCase();
    if (unique.has(key)) return jsonResponse({ error: `Duplicate character IGN: ${profile.name}.` }, 400);
    unique.add(key);
  }
  if (profiles.length && profiles.filter(profile => profile.isMain).length !== 1) return jsonResponse({ error: 'Choose exactly one Main character.' }, 400);

  try {
    const result = await getDecodedMainRecord(context.env);
    if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
    const record = result.record;
    if (!record || typeof record !== 'object' || !record.settings) return jsonResponse({ error: 'The shared main record has an unexpected structure.' }, 500);
    const settings = record.settings;
    const members = Array.isArray(settings.memberDirectory) ? settings.memberDirectory : [];
    const index = members.findIndex(member => String(member?.id || '') === memberId);
    if (index < 0) return jsonResponse({ error: 'That member no longer exists. Refresh the character list and try again.' }, 404);
    const duplicateOwner = members.find((otherMember, i) => {
      if (i === index) return false;
      const names = new Set([
        ...(Array.isArray(otherMember?.characters) ? otherMember.characters.map(item => String(typeof item === 'object' ? (item?.name || item?.ign || '') : item || '').trim()) : []),
        ...(Array.isArray(otherMember?.characterProfiles) ? otherMember.characterProfiles.map(profile => String(profile?.name || profile?.ign || '').trim()) : [])
      ].filter(Boolean).map(name => name.toLocaleLowerCase()));
      return profiles.some(profile => names.has(profile.name.toLocaleLowerCase()));
    });
    if (duplicateOwner) return jsonResponse({ error: 'One or more IGNs already belong to another member. Each character must have one owner.' }, 409);

    const now = Date.now();
    const member = members[index];
    const previousCharacterNames = new Set([
      ...(Array.isArray(member.characters) ? member.characters.map(item => String(typeof item === 'object' ? (item?.name || item?.ign || '') : item || '').trim()) : []),
      ...(Array.isArray(member.characterProfiles) ? member.characterProfiles.map(profile => String(profile?.name || profile?.ign || '').trim()) : [])
    ].filter(Boolean).map(name => name.toLocaleLowerCase()));
    const beforeSignature = JSON.stringify((Array.isArray(member.characterProfiles) ? member.characterProfiles : []).map(cleanProfile));
    const afterSignature = JSON.stringify(profiles);
    member.characters = profiles.map(profile => profile.name);
    member.characterProfiles = profiles;
    if (beforeSignature !== afterSignature) {
      // A changed registration needs a fresh member confirmation at the next login.
      member.profileConfirmedDiscordId = '';
      member.profileConfirmedAt = 0;
    }
    settings.memberDirectory = members;
    settings.memberDirectoryUpdatedAt = now;
    settings.memberDirectoryUpdatedBy = String(context.data.session.discordId);
    settings.memberRosterMasterVersion = (Number(settings.memberRosterMasterVersion) || 0) + 1;

    const oldRosters = Array.isArray(settings.rosters) ? settings.rosters : [];
    const projectedRosters = members.map(item => {
      const existing = oldRosters.find(roster => String(roster?.id || '') === String(item?.trackerRosterId || ''))
        || oldRosters.find(roster => String(roster?.name || '').trim().toLocaleLowerCase() === String(item?.name || '').trim().toLocaleLowerCase());
      const rosterId = String(existing?.id || item?.trackerRosterId || `member-roster-${String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '')}`);
      item.trackerRosterId = rosterId;
      item.color = /^#[0-9a-f]{6}$/i.test(String(item.color || '')) ? String(item.color).toLowerCase() : (existing?.color || '#7aa2f7');
      return { id: rosterId, name: String(item.name || 'Member').slice(0, 30), color: item.color, characters: (item.characterProfiles || []).filter(profile => profile.trackerEnabled).map(profile => profile.name) };
    });
    settings.rosters = projectedRosters;
    settings.rosterUpdatedAt = now;
    settings.rosterUpdatedBy = String(context.data.session.discordId);
    settings.characterJobs = settings.characterJobs && typeof settings.characterJobs === 'object' ? settings.characterJobs : {};
    for (const profile of profiles) settings.characterJobs[profile.name] = { job: profile.job, updatedAt: now, deviceId: `admin-${context.data.session.discordId}` };
    const remainingNames = new Set(members.flatMap(item => [
      ...(Array.isArray(item?.characters) ? item.characters.map(value => String(typeof value === 'object' ? (value?.name || value?.ign || '') : value || '').trim()) : []),
      ...(Array.isArray(item?.characterProfiles) ? item.characterProfiles.map(profile => String(profile?.name || profile?.ign || '').trim()) : [])
    ]).filter(Boolean).map(name => name.toLocaleLowerCase()));
    for (const oldName of previousCharacterNames) {
      if (remainingNames.has(oldName)) continue;
      const jobKey = Object.keys(settings.characterJobs).find(name => String(name).toLocaleLowerCase() === oldName);
      if (jobKey) delete settings.characterJobs[jobKey];
    }
    record.updatedAt = now;

    const packed = encodePantheonCompactRecord(record);
    await storeRecord(context.env, MAIN_ID, packed, result.row.name || 'Pantheon DN Tracker');
    await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json) VALUES (?, ?, ?, ?, ?)')
      .bind(context.data.session.discordId, 'admin-character-registration-update', '', now, JSON.stringify({ memberId, memberName: member.name, characterCount: profiles.length })).run();
    return jsonResponse({ ok: true, memberId, memberName: member.name, members: serializeMembers(record), updatedAt: now });
  } catch (error) {
    return jsonResponse({ error: `Character update failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
  }
}
