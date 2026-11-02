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
  const { members } = await loadCommunityDirectory(env);
  const member = findConfirmedMemberByDiscordId(members, discordId);
  if (!member) return { error:'Your Discord account is not linked to one unique Pantheon member profile.', status:409 };
  const enabled = await env.PANTHEON_DB.prepare('SELECT enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
  if (!enabled || Number(enabled.enabled) !== 1) return { error:'Your Pantheon account is not enabled.', status:403 };
  return { discordId, members, member };
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
    let recentActivity = [];
    try {
      const activity = await env.PANTHEON_DB.prepare(`
        SELECT o.character_name, t.task_name, t.at
        FROM character_owners o
        JOIN character_completion_timing t ON t.character_key = o.character_key
        WHERE o.owner_discord_id = ? AND o.active = 1 AND t.state = 'done'
        ORDER BY t.at DESC
        LIMIT 8
      `).bind(targetDiscordId).all();
      recentActivity = (activity.results || []).map(row => ({
        characterName:String(row.character_name || ''),
        taskName:String(row.task_name || 'Completed task'),
        at:Number(row.at) || 0
      }));
    } catch (_) { recentActivity = []; }
    return jsonResponse({ ok:true, memberId:String(target.id || ''), bio:String(bioRow?.bio || ''), bioUpdatedAt:Number(bioRow?.updated_at) || 0, recentActivity, isOwn:String(targetDiscordId) === linked.discordId });
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
