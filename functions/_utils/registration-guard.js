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
export function registrationWriteViolation(previousRecord, nextRecord, session) {
  if (session?.role === 'admin') return '';
  const initialCandidates = candidatesFor(session);
  if (!initialCandidates.length) return 'Your Discord identity could not be linked to a member name. Ask an administrator to configure your roster match.';
  const before = obj(previousRecord?.settings);
  const after = obj(nextRecord?.settings);
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
  const oldJobs = obj(before.characterJobs);
  const newJobs = obj(after.characterJobs);
  for (const name of new Set([...Object.keys(oldJobs), ...Object.keys(newJobs)])) {
    if (stable(oldJobs[name]) !== stable(newJobs[name]) && !allowedCharacterNames.has(key(name))) {
      return `Members cannot change the Class / Job record for "${name}" because it belongs to another character.`;
    }
  }
  return '';
}
