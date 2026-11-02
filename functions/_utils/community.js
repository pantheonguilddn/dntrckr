import { getRecord } from './auth.js';
import { decodePantheonCompactRecord } from './compact.js';

const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const arr = value => Array.isArray(value) ? value : [];

export async function loadCommunityDirectory(env) {
  const row = await getRecord(env, 'pantheon-main');
  if (!row?.record_json) return { record: null, members: [] };
  let record;
  try { record = decodePantheonCompactRecord(JSON.parse(row.record_json)); }
  catch (_) { throw new Error('The shared Pantheon member directory could not be read.'); }
  return { record: obj(record), members: arr(record?.settings?.memberDirectory) };
}

export function findConfirmedMemberByDiscordId(members, discordId) {
  const id = String(discordId || '').trim();
  if (!id) return null;
  const matches = arr(members).filter(member => String(member?.profileConfirmedDiscordId || '').trim() === id);
  return matches.length === 1 ? matches[0] : null;
}

export function findUniqueMemberById(members, memberId) {
  const id = String(memberId || '').trim();
  if (!id) return null;
  const matches = arr(members).filter(member => String(member?.id || '').trim() === id);
  return matches.length === 1 ? matches[0] : null;
}

export function publicMemberProfile(member, registeredName = '') {
  if (!member) return null;
  const rawProfiles = arr(member.characterProfiles);
  const rawNames = arr(member.characters).map(value => String(typeof value === 'object' ? (value?.name || value?.ign || '') : value || '').trim()).filter(Boolean);
  const seen = new Set();
  const characters = [...rawProfiles.map(profile => ({
    name: String(profile?.name || profile?.ign || '').trim(),
    job: String(profile?.job || '').trim(),
    isMain: profile?.isMain === true
  })), ...rawNames.map(name => ({ name, job: '', isMain: false }))]
    .filter(item => item.name && !seen.has(item.name.toLocaleLowerCase()) && seen.add(item.name.toLocaleLowerCase()))
    .slice(0, 100);
  const mainCharacter = characters.find(item => item.isMain) || null;
  const otherCharacters = characters.filter(item => !mainCharacter || item.name !== mainCharacter.name);
  return {
    memberId: String(member.id || ''),
    pantheonName: String(member.name || 'Pantheon Member').trim().slice(0, 60),
    registeredName: String(registeredName || member.registeredName || member.originalName || member.name || 'Discord member').trim().slice(0, 100),
    mainCharacter,
    otherCharacters,
    characterCount: characters.length
  };
}
