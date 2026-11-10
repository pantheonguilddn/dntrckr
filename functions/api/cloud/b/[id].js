import { getRecord, jsonResponse, resolveRecordId, storeRecord } from '../../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../../_utils/compact.js';
import { registrationWriteViolation, repairBootstrapAdminOwnerLinks, resolveDiscordOwnerMember } from '../../../_utils/registration-guard.js';
import { denyNonAdminRevisionJournalAccess } from '../../../_utils/admin-tool-access.js';
import { getCharacterStorageState, isCharacterStorageMigrationBusy, syncCharacterIndexes, syncCharacterStorageSettings } from '../../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const LEDGER_OWNER_NAMES = new Set(['bio', 'cheean', 'cho']);
const CELL_STATES = new Set(['open', 'done', 'excluded', 'marked', 'reset']);
function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function arr(value) { return Array.isArray(value) ? value : []; }
function normalizedCell(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    state: CELL_STATES.has(value.state) ? value.state : 'open',
    note: String(value.note || '').slice(0, 40),
    updatedAt: Number(value.updatedAt) || 0,
    deviceId: String(value.deviceId || '')
  };
}
function chooseCell(existingValue, incomingValue) {
  const existing = normalizedCell(existingValue), incoming = normalizedCell(incomingValue);
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.updatedAt !== existing.updatedAt) return incoming.updatedAt > existing.updatedAt ? incoming : existing;
  // Match the browser's deterministic tie-break: the lexically later device ID wins;
  // when both are the same device, the incoming explicit save wins.
  return incoming.deviceId >= existing.deviceId ? incoming : existing;
}
function mergeCellRecords(currentCells, incomingCells) {
  const current = obj(currentCells), incoming = obj(incomingCells), merged = {};
  for (const charName of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    const currentTasks = obj(current[charName]), incomingTasks = obj(incoming[charName]), tasks = {};
    for (const taskName of new Set([...Object.keys(currentTasks), ...Object.keys(incomingTasks)])) {
      const cell = chooseCell(currentTasks[taskName], incomingTasks[taskName]);
      if (cell) tasks[taskName] = cell;
    }
    if (Object.keys(tasks).length) merged[charName] = tasks;
  }
  return merged;
}
function normalizeTimingEntry(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return { state: 'done', at: value, ownerKey: '' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const at = Number(value.at) || Number(value.updatedAt) || 0;
  if (!at) return null;
  return { state: value.state === 'done' ? 'done' : 'open', at, ownerKey: String(value.ownerKey || value.owner || '').slice(0, 120) };
}
function chooseTimingEntry(existingValue, incomingValue) {
  const existing = normalizeTimingEntry(existingValue), incoming = normalizeTimingEntry(incomingValue);
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.at !== existing.at) return incoming.at > existing.at ? incoming : existing;
  // Match the browser: an explicit open/reopen at the same timestamp wins.
  return incoming.state === 'open' ? incoming : existing;
}
function mergeCompletionTimingRecords(currentValue, incomingValue, clearedAt = 0) {
  const current = obj(currentValue), incoming = obj(incomingValue), merged = {};
  const now = Date.now(), cutoff = now - 42 * 24 * 60 * 60 * 1000, clearAt = Number(clearedAt) || 0;
  for (const weekKey of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    const wk = Number(weekKey);
    if (!Number.isFinite(wk) || wk < cutoff || wk > now + 24 * 60 * 60 * 1000) continue;
    const curChars = obj(current[weekKey]), incChars = obj(incoming[weekKey]), chars = {};
    for (const charName of new Set([...Object.keys(curChars), ...Object.keys(incChars)])) {
      const curTasks = obj(curChars[charName]), incTasks = obj(incChars[charName]), tasks = {};
      for (const taskName of new Set([...Object.keys(curTasks), ...Object.keys(incTasks)])) {
        const entry = chooseTimingEntry(curTasks[taskName], incTasks[taskName]);
        if (entry && entry.at >= clearAt && entry.at >= cutoff && entry.at <= now + 24 * 60 * 60 * 1000) tasks[taskName] = entry;
      }
      if (Object.keys(tasks).length) chars[String(charName).slice(0, 120)] = tasks;
    }
    if (Object.keys(chars).length) merged[String(wk)] = chars;
  }
  const latestWeeks = Object.keys(merged).sort((a,b) => Number(a) - Number(b)).slice(-6);
  return Object.fromEntries(latestWeeks.map(key => [key, merged[key]]));
}
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
  return encodePantheonCompactRecord({ ...decoded, scholarship: {} });
}

const ownerKey = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
function memberNames(member) {
  const values = [
    ...arr(member?.characters).map(value => typeof value === 'object' ? (value?.name || value?.ign || '') : value),
    ...arr(member?.characterProfiles).map(profile => profile?.name || profile?.ign || '')
  ];
  return [...new Set(values.map(value => String(value || '').normalize('NFKC').trim().slice(0, 40)).filter(Boolean))];
}
function cleanMemberIntentPayload(value) {
  const id = String(value?.id || '').trim().slice(0, 120).replace(/[^a-zA-Z0-9_-]/g, '');
  const name = String(value?.name || '').trim().slice(0, 60);
  if (!id || !name) throw new Error('A member add/update must include a valid member ID and owner name.');
  const rawProfiles = arr(value?.characterProfiles);
  const profileByName = new Map();
  for (const raw of rawProfiles) {
    const profileName = String(raw?.name || raw?.ign || '').normalize('NFKC').trim().slice(0, 40);
    if (!profileName) continue;
    profileByName.set(ownerKey(profileName), {
      name: profileName,
      job: String(raw?.job || '').trim().slice(0, 60),
      trackerEnabled: raw?.trackerEnabled === true,
      isMain: raw?.isMain === true
    });
  }
  const names = [...new Set([...memberNames(value), ...[...profileByName.values()].map(profile => profile.name)])].slice(0, 100);
  const characterProfiles = names.map(characterName => profileByName.get(ownerKey(characterName)) || {
    name: characterName, job: '', trackerEnabled: false, isMain: false
  });
  return {
    id, name, characters: names, characterProfiles,
    trackerRosterId: String(value?.trackerRosterId || '').trim().slice(0, 120).replace(/[^a-zA-Z0-9_-]/g, ''),
    color: /^#[0-9a-f]{6}$/i.test(String(value?.color || '')) ? String(value.color).toLowerCase() : '#7aa2f7',
    note: String(value?.note || '').trim().slice(0, 160),
    profileConfirmedDiscordId: String(value?.profileConfirmedDiscordId || '').trim().slice(0, 80),
    profileConfirmedAt: Number(value?.profileConfirmedAt) || 0,
    ledgerAccess: value?.ledgerAccess === true,
    isBootstrapPersonalOwner: value?.isBootstrapPersonalOwner === true
  };
}
function projectDirectoryRosters(members, oldRosters, explicitOptOutsByMember = new Map()) {
  return members.map(member => {
    const existing = oldRosters.find(roster => String(roster?.id || '') === String(member?.trackerRosterId || ''))
      || oldRosters.find(roster => ownerKey(roster?.name) === ownerKey(member?.name));
    const rosterId = String(existing?.id || member?.trackerRosterId || `member-roster-${String(member?.id || '').replace(/[^a-zA-Z0-9_-]/g, '')}`);
    member.trackerRosterId = rosterId;
    member.color = /^#[0-9a-f]{6}$/i.test(String(member?.color || '')) ? String(member.color).toLowerCase()
      : (/^#[0-9a-f]{6}$/i.test(String(existing?.color || '')) ? String(existing.color).toLowerCase() : '#7aa2f7');
    const profiles = new Map(arr(member?.characterProfiles).map(profile => [ownerKey(profile?.name || profile?.ign), profile]));
    const names = memberNames(member);
    const previouslyTrackedNames = new Set(arr(existing?.characters).map(ownerKey));
    const explicitOptOutNames = explicitOptOutsByMember.get(String(member?.id || '')) || new Set();
    const trackedNames = names.filter(name => {
      const key = ownerKey(name);
      const profile = profiles.get(key);
      if (profile?.trackerEnabled === true) return true;
      // Missing/false legacy flags are NOT opt-outs. Preserve the committed Tracker
      // membership unless this member's latest explicit save names the character as
      // intentionally unchecked. Characters removed from Member Roster are absent
      // from `names` and therefore are naturally removed from the projection.
      if (explicitOptOutNames.has(key)) return false;
      return previouslyTrackedNames.has(key);
    });
    return { id: rosterId, name: String(member?.name || 'Member').slice(0, 30), color: member.color, characters: trackedNames };
  });
}
function applyMemberDirectoryIntents(previous, next, rawIntents, session, adminOverride) {
  const previousSettings = obj(previous?.settings);
  const nextSettings = obj(next?.settings);
  const currentMembers = arr(previousSettings.memberDirectory).map((member, index) => ({
    ...obj(member),
    // Match the browser's deterministic legacy fallback for pre-ID records.
    id: String(member?.id || `member-${index}`).trim().slice(0, 120).replace(/[^a-zA-Z0-9_-]/g, '') || `member-${index}`
  }));
  const intents = arr(rawIntents).slice(0, 50);
  const oldRosters = arr(previousSettings.rosters);
  const deletedCharacterNames = new Set();
  const explicitOptOutsByMember = new Map();
  for (const raw of intents) {
    const op = String(raw?.op || '');
    if (op === 'remove') {
      if (!adminOverride) throw Object.assign(new Error('Only an administrator can remove a member record.'), { status: 403 });
      const id = String(raw?.memberId || '').trim().slice(0, 120);
      if (!id) throw new Error('A member ID is required for a removal.');
      const index = currentMembers.findIndex(member => String(member.id || '') === id);
      if (index >= 0) {
        memberNames(currentMembers[index]).forEach(name => deletedCharacterNames.add(ownerKey(name)));
        currentMembers.splice(index, 1);
      }
      continue;
    }
    if (op !== 'add' && op !== 'upsert') throw new Error('Unsupported Member Roster operation. Refresh the page and retry.');
    // r06-r09 clients queued every legacy directory row as an upsert during migration.
    // Those requests have no trackerOptOutNames field and may contain stale/normalized
    // character profiles. Treat legacy upserts as migration noise, not as user edits.
    // Current clients always send an array (including []), so intentional edits still
    // apply and are distinguishable from these unsafe bulk migration writes.
    if (op === 'upsert' && !Array.isArray(raw?.trackerOptOutNames)) continue;
    let member = cleanMemberIntentPayload(raw?.member);
    const index = currentMembers.findIndex(item => String(item.id || '') === member.id);
    if (op === 'add' && index >= 0) {
      // Idempotent retry after a successful server commit whose response was lost.
      continue;
    }
    if (op === 'upsert' && index < 0) throw Object.assign(new Error('That member no longer exists in the shared roster. Refresh before editing.'), { status: 409 });
    const duplicateOwner = currentMembers.findIndex((item, i) => i !== index && ownerKey(item.name) === ownerKey(member.name));
    if (duplicateOwner >= 0) throw Object.assign(new Error(`The owner name ${member.name} is already registered. Edit that existing member instead.`), { status: 409 });
    const existingNames = new Set(currentMembers.filter((_, i) => i !== index).flatMap(memberNames).map(ownerKey));
    const duplicateCharacter = memberNames(member).find(name => existingNames.has(ownerKey(name)));
    if (duplicateCharacter) throw Object.assign(new Error(`The IGN ${duplicateCharacter} is already assigned to another member.`), { status: 409 });
    // Opt-outs are explicit metadata from the edited member form. An absent or
    // legacy trackerEnabled:false flag is never interpreted as a request to untrack.
    const characterRosterChanged = raw?.characterRosterChanged === true;
    explicitOptOutsByMember.set(member.id, new Set(
      (characterRosterChanged ? arr(raw?.trackerOptOutNames) : []).map(name => ownerKey(name)).filter(Boolean)
    ));
    if (index >= 0) {
      const committedMember = currentMembers[index];
      memberNames(committedMember).forEach(name => deletedCharacterNames.add(ownerKey(name)));
      if (!characterRosterChanged) {
        // Metadata-only updates (owner color, class sync, and similar profile maintenance)
        // must not replace the canonical character registration using a possibly
        // stale browser snapshot. Patch safe member fields, but preserve the server's
        // character list, Tracker opt-ins, Main flags, and ordering.
        const priorProfiles = new Map(arr(committedMember.characterProfiles).map(profile => [ownerKey(profile?.name || profile?.ign), profile]));
        const incomingProfiles = new Map(arr(member.characterProfiles).map(profile => [ownerKey(profile?.name || profile?.ign), profile]));
        const preservedNames = memberNames(committedMember);
        member = {
          ...committedMember,
          ...member,
          // Only safe presentation fields are patched by a metadata-only operation.
          // Owner identity, notes, Discord confirmation, access flags, and the
          // character roster are changed only by their dedicated current-client flows.
          id: String(committedMember.id || member.id),
          name: String(committedMember.name || member.name),
          note: String(committedMember.note || ''),
          profileConfirmedDiscordId: String(committedMember.profileConfirmedDiscordId || ''),
          profileConfirmedAt: Number(committedMember.profileConfirmedAt) || 0,
          ledgerAccess: committedMember.ledgerAccess === true,
          isBootstrapPersonalOwner: committedMember.isBootstrapPersonalOwner === true,
          characters: preservedNames,
          characterProfiles: preservedNames.map(name => {
            const prior = priorProfiles.get(ownerKey(name)) || {};
            const incoming = incomingProfiles.get(ownerKey(name)) || {};
            return {
              name: String(prior.name || name),
              job: String(incoming.job || prior.job || '').slice(0, 60),
              trackerEnabled: prior.trackerEnabled === true,
              isMain: prior.isMain === true
            };
          }),
          trackerRosterId: String(committedMember.trackerRosterId || member.trackerRosterId || '')
        };
      }
      currentMembers[index] = member;
    } else {
      currentMembers.push(member);
    }
  }

  const finalNames = new Set(currentMembers.flatMap(memberNames).map(ownerKey));
  const jobs = { ...obj(previousSettings.characterJobs) };
  for (const raw of intents) {
    if (raw?.op === 'remove') continue;
    if (raw?.op === 'upsert' && !Array.isArray(raw?.trackerOptOutNames)) continue;
    const member = cleanMemberIntentPayload(raw?.member);
    for (const profile of arr(member.characterProfiles)) {
      if (profile.job) jobs[profile.name] = { job: profile.job, updatedAt: Date.now(), deviceId: String(session?.discordId || '') };
    }
  }
  for (const key of deletedCharacterNames) {
    if (finalNames.has(key)) continue;
    const jobKey = Object.keys(jobs).find(name => ownerKey(name) === key);
    if (jobKey) delete jobs[jobKey];
  }

  next.settings = nextSettings;
  next.settings.memberDirectory = currentMembers;
  next.settings.rosters = projectDirectoryRosters(currentMembers, oldRosters, explicitOptOutsByMember);
  next.settings.characterJobs = jobs;
  const now = Date.now();
  next.settings.memberDirectoryUpdatedAt = now;
  next.settings.memberDirectoryUpdatedBy = String(session?.discordId || '');
  next.settings.rosterUpdatedAt = now;
  next.settings.rosterUpdatedBy = String(session?.discordId || '');
  next.settings.memberRosterMasterVersion = Math.max(1, Number(previousSettings.memberRosterMasterVersion) || 0, Number(next.settings.memberRosterMasterVersion) || 0);
}
function sameMemberIdSet(left, right) {
  const ids = list => new Set(arr(list).map(member => String(member?.id || member?.name || '').trim()).filter(Boolean));
  const a = ids(left), b = ids(right);
  return a.size === b.size && [...a].every(id => b.has(id));
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
    const session = context.data?.session;
    const responseRecord = resolvedId === MAIN_ID
      ? (hasLedgerAccess(session, decoded) ? encodePantheonCompactRecord(decoded) : redactLedgerRecord(decoded))
      : packed;
    return jsonResponse({ metadata: { id: requestedId, name: row.name, private: true, updatedAt: row.updated_at }, record: responseRecord });
  } catch (_) { return jsonResponse({ message: 'Stored record is corrupt.' }, 500); }
}

export async function onRequestPut(context) {
  const { params, request, env } = context;
  const requestedId = String(params.id || '');
  const targetId = await resolveRecordId(env, requestedId);
  const denied = await denyNonAdminRevisionJournalAccess(context, requestedId);
  if (denied) return denied;
  if (targetId === MAIN_ID && await isCharacterStorageMigrationBusy(env)) {
    return jsonResponse({ code:'CHARACTER_STORAGE_MIGRATION_BUSY', retryable:true, message:'Player storage migration is copying a consistent Tracker snapshot. Your edit is retained; retry after the migration finishes.' }, 503);
  }
  let incomingRecord;
  try { incomingRecord = await request.json(); } catch (_) { return jsonResponse({ message: 'Invalid JSON body.' }, 400); }

  // Main tracker sync is a whole-record payload, so concurrent clients can otherwise
  // overwrite one another between the read and write. Merge task records against the
  // latest D1 value, then use a compare-and-swap UPDATE. Retry if another writer wins.
  // This keeps the existing API contract and does not require a schema migration.
  for (let attempt = 1; attempt <= 5; attempt++) {
    const current = await env.PANTHEON_DB.prepare('SELECT id, name, record_json, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(targetId).first();
    if (!current) return jsonResponse({ message: 'Record not found.' }, 404);

    let recordToStore = incomingRecord;
    let responseRecord = incomingRecord;
    if (targetId === MAIN_ID) {
      try {
        const previousPacked = JSON.parse(current.record_json);
        const previous = decodePantheonCompactRecord(previousPacked);
        const next = decodePantheonCompactRecord(incomingRecord);
        if (!next || typeof next !== 'object') return jsonResponse({ message: 'Invalid tracker record.' }, 400);
        // A stale tab may submit an old value for tasks it never edited. Keep the newer
        // per-cell record from D1 instead of allowing a routine sync to undo it.
        let storageState = null;
        try { storageState = await getCharacterStorageState(env); } catch (_) {}
        const separateCharacterStorage = Number(storageState?.migration_complete) === 1;
        const incomingCells = obj(next.cells);
        const cellWriteIntents = separateCharacterStorage ? [] : (Array.isArray(incomingRecord?.cellWriteIntents) ? incomingRecord.cellWriteIntents.slice(0, 5000) : []);
        if (separateCharacterStorage) {
          // Preserve the immutable legacy snapshot in the main record. Live progress is
          // overlaid from character_task_cells by the read endpoints after migration.
          next.cells = obj(previous?.cells);
          next.completionTiming = obj(previous?.completionTiming);
        } else {
          next.cells = mergeCellRecords(previous?.cells, incomingCells);
        }
        for (const rawIntent of cellWriteIntents) {
          const intent = obj(rawIntent);
          const charName = String(intent.charName || '').trim().slice(0, 40);
          const taskName = String(intent.taskName || '').trim().slice(0, 140);
          const state = String(intent.state || 'open');
          const note = String(intent.note || '').slice(0, 40);
          const submittedCell = normalizedCell(incomingCells?.[charName]?.[taskName]);
          if (!charName || !taskName || !CELL_STATES.has(state) || !submittedCell || submittedCell.state !== state || submittedCell.note !== note) continue;
          if (!next.cells[charName]) next.cells[charName] = {};
          // Preserve the submitted edit so the registration guard can validate ownership
          // before the authoritative server timestamp is assigned.
          next.cells[charName][taskName] = { ...submittedCell, state, note };
        }
        // Group-run timing is shared learning data. Merge it independently so members' whole-record
        // syncs cannot erase another member's timestamps. A newer history-clear marker always wins.
        next.settings = next.settings && typeof next.settings === 'object' ? next.settings : {};
        const adminOverride = context.data?.session?.role === 'admin' && request.headers.get('X-Pantheon-Admin-Mode') === '1';
        // The Class / Job Catalog is append-only and administrator-owned. Member syncs,
        // stale pre-catalog clients, and older admin tabs cannot erase committed entries.
        const previousCatalog = obj(previous?.settings?.classJobCatalog);
        const incomingCatalog = obj(next.settings.classJobCatalog);
        if (!adminOverride || !Object.prototype.hasOwnProperty.call(next.settings, 'classJobCatalog')) {
          next.settings.classJobCatalog = previous?.settings?.classJobCatalog || { classes: [], jobs: [], updatedAt: 0, updatedBy: '' };
        } else {
          const classMap = new Map();
          for (const raw of [...(Array.isArray(previousCatalog.classes) ? previousCatalog.classes : []), ...(Array.isArray(incomingCatalog.classes) ? incomingCatalog.classes : [])]) {
            const name = String(typeof raw === 'string' ? raw : raw?.name || '').trim().slice(0, 48);
            if (name && !classMap.has(name.toLocaleLowerCase()) && classMap.size < 100) classMap.set(name.toLocaleLowerCase(), name);
          }
          // Built-in r11 classes are valid parents too (for example Silver Hunter under Archer).
          const allowedClasses = new Set(['Academic', 'Archer', 'Assassin', 'Cleric', 'Kali', 'Sorceress', 'Warrior', ...classMap.values()].map(name => name.toLocaleLowerCase()));
          const jobMap = new Map();
          for (const raw of [...(Array.isArray(previousCatalog.jobs) ? previousCatalog.jobs : []), ...(Array.isArray(incomingCatalog.jobs) ? incomingCatalog.jobs : [])]) {
            const item = obj(raw);
            const name = String(item.name || '').trim().slice(0, 48);
            const className = String(item.className || '').trim().slice(0, 48);
            const key = name.toLocaleLowerCase();
            if (!name || !className || !allowedClasses.has(className.toLocaleLowerCase()) || jobMap.has(key) || jobMap.size >= 300) continue;
            jobMap.set(key, { name, className, basicJob: item.basicJob === true });
          }
          const newerCatalog = Number(incomingCatalog.updatedAt) >= Number(previousCatalog.updatedAt) ? incomingCatalog : previousCatalog;
          next.settings.classJobCatalog = {
            classes: [...classMap.values()],
            jobs: [...jobMap.values()],
            updatedAt: Math.max(Number(previousCatalog.updatedAt) || 0, Number(incomingCatalog.updatedAt) || 0),
            updatedBy: String(newerCatalog.updatedBy || '').slice(0, 100)
          };
        }
        // Extra Dungeon classification is controlled only by the authenticated Admin Console API.
        // Preserve the committed server value even when a member or older admin tab submits a stale snapshot.
        next.settings.extraDungeonTasks = Array.isArray(previous?.settings?.extraDungeonTasks) ? previous.settings.extraDungeonTasks : [];
        next.settings.extraDungeonTasksUpdatedAt = Number(previous?.settings?.extraDungeonTasksUpdatedAt) || 0;
        next.settings.extraDungeonTasksUpdatedBy = String(previous?.settings?.extraDungeonTasksUpdatedBy || '');
        // Default-N/A task policies are admin-owned shared configuration. Preserve the
        // server's committed list even when a member submits an older browser snapshot.
        next.settings.defaultExcludedTasks = Array.isArray(previous?.settings?.defaultExcludedTasks) ? previous.settings.defaultExcludedTasks : [];
        next.settings.defaultExcludedTasksUpdatedAt = Number(previous?.settings?.defaultExcludedTasksUpdatedAt) || 0;
        next.settings.defaultExcludedTasksUpdatedBy = String(previous?.settings?.defaultExcludedTasksUpdatedBy || '');
        const previousClearAt = Number(previous?.settings?.analyticsHistoryClearedAt) || 0;
        const incomingClearAt = Number(next.settings.analyticsHistoryClearedAt) || 0;
        const timingClearAt = Math.max(previousClearAt, incomingClearAt);
        if (previousClearAt > incomingClearAt) {
          next.settings.analyticsHistoryClearedAt = previousClearAt;
          next.settings.analyticsHistoryClearedBy = String(previous?.settings?.analyticsHistoryClearedBy || '');
        }
        if (!separateCharacterStorage) next.completionTiming = mergeCompletionTimingRecords(previous?.completionTiming, next.completionTiming, timingClearAt);
        else next.completionTiming = obj(previous?.completionTiming);

        const memberDirectoryIntents = Array.isArray(incomingRecord?.memberDirectoryIntents)
          ? incomingRecord.memberDirectoryIntents.slice(0, 50) : [];
        if (memberDirectoryIntents.length) {
          try {
            applyMemberDirectoryIntents(previous, next, memberDirectoryIntents, context.data?.session, adminOverride);
          } catch (error) {
            const status = Number(error?.status) || 400;
            return jsonResponse({ code:'MEMBER_DIRECTORY_INTENT_REJECTED', error:String(error?.message || error).slice(0, 240), message:String(error?.message || error).slice(0, 240) }, status);
          }
        } else {
          if (!sameMemberIdSet(previous?.settings?.memberDirectory, next.settings.memberDirectory)) {
            // Never accept an entire stale/incomplete browser roster as an implicit add
            // or deletion. Member changes must arrive as explicit, single-owner intents.
            return jsonResponse({
              code:'MEMBER_DIRECTORY_REFRESH_REQUIRED',
              retryable:true,
              message:'Member Roster changed without a safe member-level operation. No member registrations were changed. Reload the app and retry the Member Roster action.'
            }, 409);
          }
          // Even when the IDs happen to match, an older client may hold stale character
          // profiles, Discord links, ordering, colors, or classes. Never let an ordinary
          // whole-record sync replace the canonical member records. The r06 UI sends an
          // explicit per-member operation for every supported roster edit above.
          next.settings.memberDirectory = arr(previous?.settings?.memberDirectory);
          next.settings.memberDirectoryUpdatedAt = Number(previous?.settings?.memberDirectoryUpdatedAt) || 0;
          next.settings.memberDirectoryUpdatedBy = String(previous?.settings?.memberDirectoryUpdatedBy || '');
          next.settings.memberRosterMasterVersion = Number(previous?.settings?.memberRosterMasterVersion) || 0;
          next.settings.rosters = arr(previous?.settings?.rosters);
          next.settings.rosterUpdatedAt = Number(previous?.settings?.rosterUpdatedAt) || 0;
          next.settings.rosterUpdatedBy = String(previous?.settings?.rosterUpdatedBy || '');
          next.settings.characterJobs = obj(previous?.settings?.characterJobs);
        }
        if (!adminOverride) {
          const violation = registrationWriteViolation(previous, next, context.data?.session, { enforceForAdmin:true });
          if (violation) return jsonResponse({ error: violation, message: violation }, 403);
          if (!adminOverride) repairBootstrapAdminOwnerLinks(next, context.data?.session);
          // Rate-Up scheduling is a shared admin-owned setting. A member's ordinary tracker sync
          // must never alter or erase this schedule, even if their cached record predates the field.
          next.settings = next.settings && typeof next.settings === 'object' ? next.settings : {};
          next.settings.rateUpEvents = previous.settings?.rateUpEvents || {
            itemDrop: { enabled: false, schedule: 'weekend', customStart: '', customEnd: '' },
            enhancement: { enabled: false, schedule: 'weekend', customStart: '', customEnd: '' }
          };
          next.settings.rateUpEventsUpdatedAt = Number(previous.settings?.rateUpEventsUpdatedAt) || 0;
          next.settings.rateUpEventsUpdatedBy = String(previous.settings?.rateUpEventsUpdatedBy || '');
          // UI text overrides are admin-owned shared configuration; stale member caches must not replace them.
          next.settings.uiTextOverrides = previous.settings?.uiTextOverrides || {};
          next.settings.uiTextOverridesUpdatedAt = Number(previous.settings?.uiTextOverridesUpdatedAt) || 0;
          next.settings.uiTextOverridesUpdatedBy = String(previous.settings?.uiTextOverridesUpdatedBy || '');
        }

      // Explicit cell-write intents are stamped by the server, not by the member's
      // workstation clock. This prevents a clock-skewed client from losing a valid
      // checkbox/note edit to a newer timestamp generated on another device. Intents
      // are transient request metadata and are never stored in the shared record.
      for (const rawIntent of cellWriteIntents) {
        const intent = obj(rawIntent);
        const charName = String(intent.charName || '').trim().slice(0, 40);
        const taskName = String(intent.taskName || '').trim().slice(0, 140);
        const state = String(intent.state || 'open');
        const note = String(intent.note || '').slice(0, 40);
        if (!charName || !taskName || !CELL_STATES.has(state)) continue;
        const candidateCell = normalizedCell(next.cells?.[charName]?.[taskName]);
        // Do not let an intent become an alternate write channel; it must exactly
        // describe the cell already present in the guarded candidate record.
        if (!candidateCell || candidateCell.state !== state || candidateCell.note !== note) continue;
        const priorCell = normalizedCell(previous?.cells?.[charName]?.[taskName]);
        const serverStamp = Math.max(Date.now(), (Number(priorCell?.updatedAt) || 0) + 1);
        if (!next.cells[charName]) next.cells[charName] = {};
        next.cells[charName][taskName] = {
          state,
          note,
          updatedAt: serverStamp,
          deviceId: String(candidateCell.deviceId || context.data?.session?.discordId || '').slice(0, 120)
        };
      }

      repairBootstrapAdminOwnerLinks(next, context.data?.session);
      recordToStore = encodePantheonCompactRecord(next);
      responseRecord = recordToStore;
        const previousDecoded = previous;
        if (!hasLedgerAccess(context.data?.session, previousDecoded)) {
          // Preserve ledger contents for every non-allowlisted account, including admins.
          next.scholarship = previousDecoded.scholarship || {};
          recordToStore = encodePantheonCompactRecord(next);
          responseRecord = redactLedgerRecord(next);
        }
      } catch (error) {
        return jsonResponse({ error: `Could not validate tracker update: ${String(error?.message || error).slice(0, 250)}` }, 400);
      }
    }

    // Re-check immediately before committing. A legacy whole-record write may have
    // passed the first guard just before the automatic migration acquired its lock.
    // Reject it here rather than allowing it to race the migration snapshot.
    if (targetId === MAIN_ID && await isCharacterStorageMigrationBusy(env)) {
      return jsonResponse({ code:'CHARACTER_STORAGE_MIGRATION_BUSY', retryable:true, message:'Player storage migration has started. Your shared settings change is retained locally; retry when setup completes.' }, 503);
    }
    let writeResult;
    const savedAt = Math.max(Date.now(), (Number(current.updated_at) || 0) + 1);
    try {
      writeResult = await env.PANTHEON_DB.prepare(`
        UPDATE data_records SET name = ?, record_json = ?, updated_at = ?
        WHERE id = ? AND record_json = ?
      `).bind(current.name || 'Pantheon record', JSON.stringify(recordToStore), savedAt, targetId, current.record_json).run();
    } catch (error) {
      return jsonResponse({ message: String(error?.message || error) }, 413);
    }
    if (Number(writeResult?.meta?.changes) > 0) {
      if (targetId === MAIN_ID) {
        const previousDecoded = decodePantheonCompactRecord(JSON.parse(current.record_json));
        const savedDecoded = decodePantheonCompactRecord(recordToStore);
        const ownerIndexChanged = JSON.stringify(previousDecoded?.settings?.memberDirectory || []) !== JSON.stringify(savedDecoded?.settings?.memberDirectory || [])
          || JSON.stringify(previousDecoded?.settings?.rosters || []) !== JSON.stringify(savedDecoded?.settings?.rosters || [])
          || JSON.stringify(previousDecoded?.settings?.categories || []) !== JSON.stringify(savedDecoded?.settings?.categories || []);
        if (ownerIndexChanged) {
          try { await syncCharacterIndexes(env, savedDecoded, savedAt); }
          catch (error) { return jsonResponse({ code:'OWNER_INDEX_REFRESH_FAILED', retryable:true, message:`Tracker settings were saved, but the player ownership index needs a retry: ${String(error?.message || error).slice(0,180)}` }, 503); }
        }
        try { await syncCharacterStorageSettings(env, savedDecoded, savedAt); } catch (_) {}
        // Character cells and completion timing live in their own tables. Do not
        // rescan those tables just to acknowledge a global/settings write; clients
        // retain their last snapshot and receive subsequent cell changes via /changes.
        try {
          const committed = decodePantheonCompactRecord(recordToStore);
          responseRecord = hasLedgerAccess(context.data?.session, committed)
            ? encodePantheonCompactRecord(committed)
            : redactLedgerRecord(committed);
        } catch (_) { /* The committed response remains available in its original form. */ }
      }
      return jsonResponse({ metadata: { id: requestedId, name: current.name, private: true, updatedAt: savedAt, recordUpdatedAt:savedAt }, record: responseRecord });
    }
    // Another writer changed the row between SELECT and UPDATE. Re-read and merge again.
  }
  return jsonResponse({ error: 'The shared tracker changed repeatedly while saving. Your local edit is retained; press Sync Changes to retry.', message: 'Concurrent tracker updates detected.' }, 409);
}
