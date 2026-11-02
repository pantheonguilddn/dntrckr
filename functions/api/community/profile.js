import { jsonResponse } from '../../_utils/auth.js';
import { loadCommunityDirectory, findConfirmedMemberByDiscordId, findUniqueMemberById } from '../../_utils/community.js';

let profileSchemaPromise = null;
async function ensureProfileTable(env) {
  if (!profileSchemaPromise) {
    profileSchemaPromise = env.PANTHEON_DB.prepare(`CREATE TABLE IF NOT EXISTS guild_member_profiles (
      discord_id TEXT PRIMARY KEY,
      bio TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT 0
    )`).run().then(() => true).catch(error => { profileSchemaPromise = null; throw error; });
  }
  return profileSchemaPromise;
}

async function getLinked(env, session) {
  const discordId = String(session?.discordId || '').trim();
  if (!discordId) return { error:'Authentication required.', status:401 };
  const directory = await loadCommunityDirectory(env);
  const members = directory.members;
  const member = findConfirmedMemberByDiscordId(members, discordId);
  if (!member) return { error:'Your Discord account is not linked to one unique Pantheon member profile.', status:409 };
  const enabled = await env.PANTHEON_DB.prepare('SELECT enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
  if (!enabled || Number(enabled.enabled) !== 1) return { error:'Your Pantheon account is not enabled.', status:403 };
  return { discordId, members, record:directory.record, member };
}

function normalizeTaskKey(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
}

function getEligibleWeeklyTasks(record) {
  const settings = record?.settings && typeof record.settings === 'object' ? record.settings : {};
  const categories = Array.isArray(settings.categories) ? settings.categories : [];
  const bountyTasks = new Set(categories
    .filter(category => String(category?.name || '').toLocaleLowerCase().includes('bounty'))
    .flatMap(category => Array.isArray(category?.tasks) ? category.tasks : [])
    .map(normalizeTaskKey));
  const extraTasks = new Set((Array.isArray(settings.extraDungeonTasks) ? settings.extraDungeonTasks : []).map(normalizeTaskKey));
  const seen = new Set();
  const tasks = [];
  for (const category of categories) {
    if (String(category?.group || '') !== 'Weeklies') continue;
    for (const rawName of Array.isArray(category?.tasks) ? category.tasks : []) {
      const name = String(rawName || '').trim().slice(0, 140);
      const key = normalizeTaskKey(name);
      if (!key || seen.has(key) || bountyTasks.has(key) || extraTasks.has(key)) continue;
      seen.add(key);
      tasks.push(name);
    }
  }
  return tasks.slice(0, 250);
}

async function loadWeeklyActivity(env, target, record) {
  const tasks = getEligibleWeeklyTasks(record);
  if (!tasks.length) return { activitySnapshot:null, nextFocus:null };
  const targetDiscordId = String(target?.profileConfirmedDiscordId || '').trim();
  if (!targetDiscordId) return { activitySnapshot:null, nextFocus:null };

  // Read only this member's tracked characters and the current eligible weekly task cells.
  // The owner index and character/task primary key keep this bounded to one member.
  const taskKeys = tasks.map(normalizeTaskKey);
  const placeholders = taskKeys.map(() => '?').join(',');
  const rows = await env.PANTHEON_DB.prepare(`
    SELECT o.character_key, o.character_name, c.task_key, c.state
    FROM character_owners o
    LEFT JOIN character_task_cells c
      ON c.character_key = o.character_key AND c.task_key IN (${placeholders})
    WHERE o.owner_discord_id = ? AND o.active = 1 AND o.tracker_enabled = 1
  `).bind(...taskKeys, targetDiscordId).all();

  const characters = new Map();
  const states = new Map();
  for (const row of rows.results || []) {
    const characterKey = String(row.character_key || '');
    if (!characterKey) continue;
    if (!characters.has(characterKey)) characters.set(characterKey, String(row.character_name || 'Character'));
    const taskKey = normalizeTaskKey(row.task_key);
    if (taskKey) states.set(`${characterKey}\u0000${taskKey}`, String(row.state || 'open'));
  }

  const settings = record?.settings && typeof record.settings === 'object' ? record.settings : {};
  const weights = settings.lootWeights && typeof settings.lootWeights === 'object' ? settings.lootWeights : {};
  const profiles = Array.isArray(target?.characterProfiles) ? target.characterProfiles : [];
  const mainProfile = profiles.find(item => item?.isMain === true);
  const mainName = normalizeTaskKey(mainProfile?.name || mainProfile?.ign || '');
  const characterRows = [...characters.entries()].map(([key, name]) => ({
    key, name, isMain:normalizeTaskKey(name) === mainName
  })).sort((a,b) => Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name));

  let completed = 0;
  let excluded = 0;
  const total = characterRows.length * tasks.length;
  for (const character of characterRows) {
    for (const task of tasks) {
      const state = states.get(`${character.key}\u0000${normalizeTaskKey(task)}`) || 'open';
      if (state === 'done') completed++;
      else if (state === 'excluded') excluded++;
    }
  }
  const eligible = Math.max(0, total - excluded);
  const activitySnapshot = {
    completed,
    eligible,
    excluded,
    trackedCharacters:characterRows.length,
    rate:eligible ? Math.round(completed / eligible * 100) : null
  };

  let focusCharacter = null;
  let focusTasks = [];
  for (const character of characterRows) {
    const candidates = tasks.map((name, index) => {
      const state = states.get(`${character.key}\u0000${normalizeTaskKey(name)}`) || 'open';
      return { name, index, state, weight:Math.max(1, Math.min(5, Number(weights[name] ?? weights[normalizeTaskKey(name)] ?? 3) || 3)) };
    }).filter(item => item.state !== 'done' && item.state !== 'excluded')
      .sort((a,b) => b.weight - a.weight || a.index - b.index);
    if (candidates.length) {
      focusCharacter = character;
      focusTasks = candidates.slice(0, 2).map(item => ({ name:item.name, priority:item.weight }));
      break;
    }
  }

  const mainIsTracked = characterRows.some(character => character.isMain);
  return {
    activitySnapshot,
    nextFocus:eligible === 0
      ? { unavailable:true, characterName:'', isMain:false, tasks:[], note:'No eligible weekly checks remain for this member in the current reset period.' }
      : focusCharacter ? {
        characterName:focusCharacter.name,
        isMain:focusCharacter.isMain,
        tasks:focusTasks,
        note:focusCharacter.isMain
          ? 'Suggested from this character’s highest-priority unfinished weekly tasks.'
          : (mainIsTracked ? 'The main character has no remaining eligible weekly tasks. This is the next tracked character with unfinished tasks.' : (mainName ? 'The main character is not currently included in the Tracker. This is the next tracked character with unfinished tasks.' : 'Suggested from the first tracked character with unfinished weekly tasks.'))
      } : { complete:true, characterName:'', isMain:false, tasks:[], note:'All eligible weekly checks are complete across tracked characters.' }
  };
}

export async function onRequestGet({ request, env, data }) {
  try {
    const linked = await getLinked(env, data?.session);
    if (linked.error) return jsonResponse({ error:linked.error }, linked.status);
    await ensureProfileTable(env);
    const memberId = String(new URL(request.url).searchParams.get('memberId') || '').trim();
    const target = memberId ? findUniqueMemberById(linked.members, memberId) : linked.member;
    if (!target) return jsonResponse({ error:'Member profile not found.' }, 404);
    const targetDiscordId = String(target.profileConfirmedDiscordId || '').trim();
    if (!targetDiscordId || linked.members.filter(item => String(item.profileConfirmedDiscordId || '').trim() === targetDiscordId).length !== 1) {
      return jsonResponse({ error:'This member has not linked one unique Discord account.' }, 409);
    }
    const bioRow = await env.PANTHEON_DB.prepare('SELECT bio, updated_at FROM guild_member_profiles WHERE discord_id = ? LIMIT 1').bind(targetDiscordId).first();
    let activity = { activitySnapshot:null, nextFocus:null };
    try { activity = await loadWeeklyActivity(env, target, linked.record); } catch (_) { /* Keep the public profile available if player storage is still provisioning. */ }
    return jsonResponse({
      ok:true,
      memberId:String(target.id || ''),
      bio:String(bioRow?.bio || ''),
      bioUpdatedAt:Number(bioRow?.updated_at) || 0,
      ...activity,
      isOwn:String(targetDiscordId) === linked.discordId
    });
  } catch (error) {
    return jsonResponse({ error:`Could not load member details: ${String(error?.message || error).slice(0,180)}` }, 503);
  }
}

export async function onRequestPut({ request, env, data }) {
  try {
    const linked = await getLinked(env, data?.session);
    if (linked.error) return jsonResponse({ error:linked.error }, linked.status);
    await ensureProfileTable(env);
    let body;
    try { body = await request.json(); } catch (_) { return jsonResponse({ error:'Expected a JSON profile body.' }, 400); }
    const bio = String(body?.bio || '').normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if ([...bio].length > 240) return jsonResponse({ error:'Your bio must be 240 characters or fewer.' }, 400);
    const now = Date.now();
    await env.PANTHEON_DB.prepare(`
      INSERT INTO guild_member_profiles (discord_id, bio, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET bio = excluded.bio, updated_at = excluded.updated_at
    `).bind(linked.discordId, bio, now).run();
    return jsonResponse({ ok:true, bio, updatedAt:now });
  } catch (error) {
    return jsonResponse({ error:`Could not save your bio: ${String(error?.message || error).slice(0,180)}` }, 503);
  }
}
