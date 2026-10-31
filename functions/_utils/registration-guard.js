const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const arr = value => Array.isArray(value) ? value : [];
const key = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
const compactKey = value => key(value).replace(/[\s._-]+/g, '');
const VALID_JOBS = new Set(['Adept','Physician','Gear Master','Shooting Star','Sniper','Artillery','Wind Walker','Tempest','Light Fury','Abyss Walker','Raven','Ripper','Saint','Inquisitor','Crusader','Guardian','Spirit Dancer','Blade Dancer','Dark Summoner','Soul Eater','Saleana','Elestra','Majesty','Smasher','Gladiator','Moonlord','Barbarian','Destroyer','Dark Avenger']);
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(name => `${JSON.stringify(name)}:${stable(value[name])}`).join(',')}}`;
};
function cleanNames(value) {
  return arr(value).map(item => String(typeof item === 'object' ? (item?.name || item?.ign || '') : item || '').trim()).filter(Boolean);
}
function memberProjection(member) {
  if (!member) return null;
  const characters = cleanNames(member.characters).map(name => name.slice(0, 40));
  const rawProfiles = arr(member.characterProfiles);
  const byName = new Map(rawProfiles.map(profile => [key(String(profile?.name || profile?.ign || '').trim().slice(0, 40)), profile]));
  const names = [...new Set([...characters, ...rawProfiles.map(profile => String(profile?.name || profile?.ign || '').trim().slice(0, 40)).filter(Boolean)])];
  return {
    id: (String(member.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '') || ''),
    name: String(member.name || '').trim().slice(0, 60),
    note: String(member.note || '').trim().slice(0, 160),
    trackerRosterId: String(member.trackerRosterId || '').trim().replace(/[^a-zA-Z0-9_-]/g, ''),
    color: /^#[0-9a-f]{6}$/i.test(String(member.color || '')) ? String(member.color).toLowerCase() : '#7aa2f7',
    profileConfirmedDiscordId: String(member.profileConfirmedDiscordId || ''),
    profileConfirmedAt: Number(member.profileConfirmedAt) || 0,
    characters: names.map(name => {
      const profile = byName.get(key(name)) || {};
      return {
        name,
        job: VALID_JOBS.has(String(profile.job || '')) ? String(profile.job) : '',
        trackerEnabled: profile.trackerEnabled === true,
        isMain: profile.isMain === true
      };
    })
  };
}
function rosterProjection(roster) {
  if (!roster) return null;
  return {
    id: String(roster.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, ''),
    name: String(roster.name || '').trim().slice(0, 30),
    color: /^#[0-9a-f]{6}$/i.test(String(roster.color || '')) ? String(roster.color).toLowerCase() : '#7aa2f7',
    characters: cleanNames(roster.characters).map(name => name.slice(0, 40)).sort((a, b) => key(a).localeCompare(key(b)))
  };
}
function keyed(items, fallback) {
  const out = new Map();
  for (const item of arr(items)) {
    const id = String(item?.id || '').trim() || fallback(item);
    if (id) out.set(id, item);
  }
  return out;
}
function candidatesFor(session) {
  const username = String(session?.username || '').trim();
  const label = String(session?.label || '').trim();
  const labelOverrides = !!label && key(label) !== key(username);
  return [...new Set((labelOverrides ? [label, username] : [username, label]).filter(Boolean))];
}
function memberMatchesOwner(member, candidates) {
  if (!member) return false;
  const name = String(member.name || '').trim().slice(0, 60);
  for (const candidate of candidates) if (key(name) === key(candidate)) return true;
  for (const candidate of candidates) {
    const compact = compactKey(candidate);
    if (compact && compactKey(name) === compact) return true;
  }
  return false;
}
function resolveOwnerCandidates(session, existingMembers) {
  const discordId = String(session?.discordId || '').trim();
  if (discordId) {
    const confirmed = arr(existingMembers).filter(member => String(member?.profileConfirmedDiscordId || '').trim() === discordId);
    if (confirmed.length === 1) {
      const ownerName = String(confirmed[0]?.name || '').trim();
      return ownerName ? [ownerName] : [];
    }
    if (confirmed.length > 1) return [];
  }
  const candidates = candidatesFor(session);
  // Use exactly one name as the authenticated owner identity. Prefer the explicit
  // admin-configured roster label when it maps to a record; otherwise use the first
  // candidate that uniquely maps to an existing record. This prevents a user from
  // claiming two different owner records merely because both label and username exist.
  for (const candidate of candidates) {
    const matches = arr(existingMembers).filter(member => memberMatchesOwner(member, [candidate]));
    if (matches.length === 1) return [candidate];
    if (matches.length > 1) return [];
  }
  return candidates.length ? [candidates[0]] : [];
}
function changedMapKeys(before, after, projection) {
  const a = keyed(before, item => String(item?.name || '').trim());
  const b = keyed(after, item => String(item?.name || '').trim());
  const changed = [];
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    if (stable(projection(a.get(id))) !== stable(projection(b.get(id)))) changed.push({ id, before: a.get(id), after: b.get(id) });
  }
  return changed;
}
function registrationNames(member) {
  return new Set([...cleanNames(member?.characters).map(name => name.slice(0, 40)), ...arr(member?.characterProfiles).map(profile => String(profile?.name || profile?.ign || '').trim().slice(0, 40)).filter(Boolean)].map(key));
}

/**
 * Protect the canonical Member Roster, its projected Tracker rosters, and character jobs
 * when a regular member writes the shared `pantheon-main` record. Normal task/cell updates
 * remain unrestricted; registration metadata is limited to the signed-in owner's entry.
 * Returns a user-facing violation string or an empty string when permitted.
 */
export function registrationWriteViolation(previousRecord, nextRecord, session, options = {}) {
  if (session?.role === 'admin' && options?.enforceForAdmin !== true) return '';
  const initialCandidates = candidatesFor(session);
  const before = obj(previousRecord?.settings);
  const after = obj(nextRecord?.settings);
  const sessionDiscordId = String(session?.discordId || '').trim();
  const confirmedDiscordOwners = sessionDiscordId ? arr(before.memberDirectory).filter(member => String(member?.profileConfirmedDiscordId || '').trim() === sessionDiscordId) : [];
  if (!initialCandidates.length && confirmedDiscordOwners.length !== 1) return 'Your Discord identity could not be linked to a member name. Ask an administrator to configure your roster match.';

  // Reset markers are administrator-owned globally. Regular members use a separate
  // per-roster marker so automatic resets cannot advance the whole guild's reset state.
  const beforeDailyReset = Number(previousRecord?.lastDailyReset) || 0;
  const afterDailyReset = Number(nextRecord?.lastDailyReset) || 0;
  const beforeWeeklyReset = Number(previousRecord?.lastWeeklyReset) || 0;
  const afterWeeklyReset = Number(nextRecord?.lastWeeklyReset) || 0;
  if (beforeDailyReset > 0 && beforeDailyReset !== afterDailyReset) return 'The guild-wide daily reset marker is administrator-managed.';
  if (beforeWeeklyReset > 0 && beforeWeeklyReset !== afterWeeklyReset) return 'The guild-wide weekly reset marker is administrator-managed.';

  // Keep guild-wide configuration administrator-managed at the API boundary too.
  // Members still may update their own registrations and routine tracking progress,
  // but cannot bypass hidden management controls by editing the shared record directly.
  const adminManagedSettings = [
    ['categories', 'Dungeon Registration', value => arr(value)],
    ['lootWeights', 'Loot Weights', value => obj(value)],
    ['analyticsHistoryClearedAt', 'Analytics history clearing', value => Number(value) || 0],
    ['analyticsHistoryClearedBy', 'Analytics history clearing', value => String(value || '')]
  ];
  for (const [field, label, normalize] of adminManagedSettings) {
    if (stable(normalize(before[field])) !== stable(normalize(after[field]))) {
      return `${label} can only be changed by a Pantheon administrator.`;
    }
  }
  const beforeTeamBuilder = obj(before.teamBuilder);
  const afterTeamBuilder = obj(after.teamBuilder);
  if (!!beforeTeamBuilder.splitPartyMechanic !== !!afterTeamBuilder.splitPartyMechanic) {
    return 'The Split Party Mechanic setting can only be changed by a Pantheon administrator.';
  }
  const versionFields = [
    'lastCheckpointAt', 'lastCheckpointBy', 'lastCheckpointLabel', 'lastCheckpointKind',
    'lastVersionedWriteAt', 'lastGlobalSignature', 'globalBaselineSignature',
    'revisionBinId', 'revisionBinUpdatedAt', 'revisionBinUpdatedBy', 'versioningEnabled'
  ];
  const versionProjection = value => {
    const source = obj(value);
    const out = {};
    for (const field of versionFields) {
      if (field.endsWith('At')) out[field] = Number(source[field]) || 0;
      else if (field === 'versioningEnabled') out[field] = source[field] !== false;
      else out[field] = String(source[field] || '');
    }
    return out;
  };
  if (stable(versionProjection(before.versionControl)) !== stable(versionProjection(after.versionControl))) {
    return 'Version History and savepoint controls are administrator-managed.';
  }

  const beforeMembers = arr(before.memberDirectory);
  const afterMembers = arr(after.memberDirectory);
  const candidates = resolveOwnerCandidates(session, beforeMembers);
  if (!candidates.length) return 'Your Discord identity matches more than one Member Roster owner. Ask an administrator to resolve the duplicate names.';
  const seenOwnerNames = new Map();
  for (const member of afterMembers) {
    const ownerKey = key(member?.name);
    if (!ownerKey) continue;
    if (seenOwnerNames.has(ownerKey) && seenOwnerNames.get(ownerKey) !== String(member?.id || '')) {
      return `The owner name \"${String(member?.name || '').trim()}\" already has a Member Roster registration.`;
    }
    seenOwnerNames.set(ownerKey, String(member?.id || ''));
  }
  const beforeMasterVersion = Number(before.memberRosterMasterVersion) || 0;
  const afterMasterVersion = Number(after.memberRosterMasterVersion) || 0;
  const cleanInitialSetup = beforeMasterVersion === 0 && afterMasterVersion === 1 && beforeMembers.length === 0 && afterMembers.length <= 1 && arr(before.rosters).length === 0;
  if (beforeMasterVersion !== afterMasterVersion && !cleanInitialSetup) {
    return 'The shared Member Roster version is administrator-managed. Ask an administrator to complete the initial roster migration.';
  }
  const beforeMembersById = keyed(beforeMembers, member => key(member?.name));
  const afterMembersById = keyed(afterMembers, member => key(member?.name));

  const changedMembers = [];
  for (const id of new Set([...beforeMembersById.keys(), ...afterMembersById.keys()])) {
    const oldMember = beforeMembersById.get(id);
    const newMember = afterMembersById.get(id);
    if (stable(memberProjection(oldMember)) !== stable(memberProjection(newMember))) changedMembers.push({ id, oldMember, newMember });
  }
  for (const change of changedMembers) {
    if (change.oldMember && !memberMatchesOwner(change.oldMember, candidates)) {
      return 'Members can edit only their own character registration. Use the Member Roster or ask an administrator.';
    }
    if (change.newMember && !memberMatchesOwner(change.newMember, candidates)) {
      return 'Members can add or edit only their own character registration. Use the Member Roster or ask an administrator.';
    }
    if (change.oldMember && !change.newMember) {
      return 'You can remove characters from your own registration, but only an administrator can remove the member record itself.';
    }
    if (change.oldMember && change.newMember && key(change.oldMember.name) !== key(change.newMember.name)) {
      return 'The owner name for a registered member is administrator-managed.';
    }
    if (change.oldMember && change.newMember && String(change.oldMember.trackerRosterId || '') !== String(change.newMember.trackerRosterId || '')) {
      return 'Tracker roster links are administrator-managed. Ask an administrator to repair your roster link if it is incorrect.';
    }
  }

  // One tracker roster must never be attached to two member registrations. This also
  // blocks creating a fresh member record that points at another user's existing roster.
  const rosterOwners = new Map();
  for (const member of afterMembers) {
    const rosterId = String(member?.trackerRosterId || '').trim();
    if (!rosterId) continue;
    const ownerId = String(member?.id || key(member?.name));
    if (rosterOwners.has(rosterId) && rosterOwners.get(rosterId) !== ownerId) {
      return 'A Tracker roster is already linked to another member. Ask an administrator to resolve the duplicate roster link.';
    }
    rosterOwners.set(rosterId, ownerId);
  }

  // A character IGN may belong to only one owner, even if the browser is modified manually.
  const ownership = new Map();
  for (const member of afterMembers) {
    const memberId = String(member?.id || key(member?.name));
    for (const name of registrationNames(member)) {
      if (ownership.has(name) && ownership.get(name) !== memberId) return `The IGN "${name}" is already assigned to another member.`;
      ownership.set(name, memberId);
    }
  }

  const beforeOwnedMembers = beforeMembers.filter(member => memberMatchesOwner(member, candidates));
  const afterOwnedMembers = afterMembers.filter(member => memberMatchesOwner(member, candidates));
  const ownedResetRosterIds = new Set([...beforeOwnedMembers, ...afterOwnedMembers].map(member => String(member?.trackerRosterId || '').trim()).filter(Boolean));
  const beforeResetMarkers = obj(before.memberResetMarkers);
  const afterResetMarkers = obj(after.memberResetMarkers);
  for (const rosterId of new Set([...Object.keys(beforeResetMarkers), ...Object.keys(afterResetMarkers)])) {
    if (stable(beforeResetMarkers[rosterId]) !== stable(afterResetMarkers[rosterId]) && !ownedResetRosterIds.has(rosterId)) {
      return 'Members can update automatic reset markers only for their own registered characters.';
    }
  }
  const beforeOwnedRosterIds = new Set(beforeOwnedMembers.map(member => String(member?.trackerRosterId || '')).filter(Boolean));
  const beforeOwnedRosterNames = new Set(beforeOwnedMembers.map(member => key(member?.name)).filter(Boolean));
  const afterOwnedRosterIds = new Set(afterOwnedMembers.map(member => String(member?.trackerRosterId || '')).filter(Boolean));
  const afterOwnedRosterNames = new Set(afterOwnedMembers.map(member => key(member?.name)).filter(Boolean));
  const oldConfirmedIds = new Set(beforeOwnedMembers.map(member => String(member?.profileConfirmedDiscordId || '')).filter(Boolean));
  const currentDiscordId = String(session?.discordId || '');
  for (const member of afterOwnedMembers) {
    const confirmedId = String(member?.profileConfirmedDiscordId || '');
    if (confirmedId && confirmedId !== currentDiscordId && !oldConfirmedIds.has(confirmedId)) {
      return 'You can confirm only your own Discord identity. Ask an administrator to resolve the member account mapping.';
    }
  }
  const beforeRosters = arr(before.rosters);
  const afterRosters = arr(after.rosters);
  if (afterMasterVersion >= 1) {
    const linkedRosterIds = new Set();
    for (const roster of afterRosters) {
      const rosterId = String(roster?.id || '').trim();
      const owners = afterMembers.filter(member => String(member?.trackerRosterId || '').trim() === rosterId);
      if (!rosterId || owners.length !== 1) {
        return 'Every Tracker roster must be linked to exactly one Member Roster entry. Ask an administrator to repair unlinked or duplicate rosters.';
      }
      if (linkedRosterIds.has(rosterId)) return 'Duplicate Tracker roster IDs are not allowed.';
      linkedRosterIds.add(rosterId);
      const expectedName = String(owners[0]?.name || '').trim().slice(0, 30);
      if (key(roster.name) !== key(expectedName)) {
        return 'Tracker roster names and member ownership are administrator-managed.';
      }
    }
    for (const member of afterMembers) {
      const rosterId = String(member?.trackerRosterId || '').trim();
      if (!rosterId || !afterRosters.some(roster => String(roster?.id || '').trim() === rosterId)) {
        return 'Each registered member must have exactly one linked Tracker roster. Ask an administrator to repair the roster link.';
      }
    }
  }
  for (const change of changedMapKeys(beforeRosters, afterRosters, rosterProjection)) {
    // Existing roster ownership is established from the OLD record. A member must not
    // be able to claim someone else's roster by changing their own trackerRosterId.
    if (change.before && !beforeOwnedRosterIds.has(String(change.before.id || '')) && !beforeOwnedRosterNames.has(key(change.before.name))) {
      return 'Members cannot edit another member’s Tracker roster.';
    }
    if (change.after && !afterOwnedRosterIds.has(String(change.after.id || '')) && !afterOwnedRosterNames.has(key(change.after.name))) {
      return 'Members cannot create or modify another member’s Tracker roster.';
    }
  }

  const allowedCharacterNames = new Set();
  for (const member of [...beforeOwnedMembers, ...afterOwnedMembers]) for (const name of registrationNames(member)) allowedCharacterNames.add(name);

  // Universal View is read-only for characters that do not belong to the caller.
  // Enforce this against the full shared record at the API boundary as well as in the UI,
  // so a hand-crafted request cannot mark, unmark, reset, or edit another person's tasks.
  const beforeCells = obj(previousRecord?.cells);
  const afterCells = obj(nextRecord?.cells);
  for (const characterName of new Set([...Object.keys(beforeCells), ...Object.keys(afterCells)])) {
    if (stable(obj(beforeCells[characterName])) !== stable(obj(afterCells[characterName])) && !allowedCharacterNames.has(key(characterName))) {
      return `You can view progress for "${String(characterName).slice(0, 40)}", but only its registered owner or an administrator can change it.`;
    }
  }

  // Weekly snapshots feed Activity Insights, so members may contribute their own
  // character snapshots but cannot rewrite or remove another owner's history.
  const beforeArchive = obj(previousRecord?.weeklyArchive);
  const afterArchive = obj(nextRecord?.weeklyArchive);
  for (const weekKey of new Set([...Object.keys(beforeArchive), ...Object.keys(afterArchive)])) {
    const oldWeek = beforeArchive[weekKey];
    const newWeek = afterArchive[weekKey];
    if (oldWeek && !newWeek) return 'Only an administrator can remove archived weekly analytics.';
    if (!oldWeek || !newWeek) {
      const entry = obj(newWeek);
      for (const field of ['rates', 'states']) for (const characterName of Object.keys(obj(entry[field]))) {
        if (!allowedCharacterNames.has(key(characterName))) return `Members cannot add weekly analytics for another character: "${String(characterName).slice(0, 40)}".`;
      }
      continue;
    }
    if (stable(oldWeek.taskOrder) !== stable(newWeek.taskOrder)) {
      return 'Weekly analytics task order is administrator-managed.';
    }
    for (const field of ['rates', 'states']) {
      const oldMap = obj(oldWeek[field]), newMap = obj(newWeek[field]);
      for (const characterName of new Set([...Object.keys(oldMap), ...Object.keys(newMap)])) {
        if (stable(oldMap[characterName]) !== stable(newMap[characterName]) && !allowedCharacterNames.has(key(characterName))) {
          return `Members cannot change weekly analytics for another character: "${String(characterName).slice(0, 40)}".`;
        }
      }
    }
  }

  const oldJobs = obj(before.characterJobs);
  const newJobs = obj(after.characterJobs);
  for (const name of new Set([...Object.keys(oldJobs), ...Object.keys(newJobs)])) {
    if (stable(oldJobs[name]) !== stable(newJobs[name]) && !allowedCharacterNames.has(key(name))) {
      return `Members cannot change the Class / Job record for "${name}" because it belongs to another character.`;
    }
  }
  return '';
}
