import { jsonResponse } from '../_utils/auth.js';
import { loadCommunityDirectory, findConfirmedMemberByDiscordId, publicMemberProfile } from '../_utils/community.js';

// The client heartbeats every 60 seconds. A 150-second window tolerates a missed
// heartbeat without keeping a closed browser online for too long.
const ONLINE_WINDOW_MS = 150_000;
let presenceSchemaPromise = null;

async function ensurePresenceTable(env) {
  if (!presenceSchemaPromise) {
    presenceSchemaPromise = (async () => {
      const db = env.PANTHEON_DB;
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS user_presence (
          discord_id TEXT PRIMARY KEY,
          username TEXT NOT NULL DEFAULT '',
          last_seen_at INTEGER NOT NULL,
          avatar TEXT NOT NULL DEFAULT ''
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_user_presence_seen ON user_presence(last_seen_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_allowed_users_enabled ON allowed_users(enabled, discord_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(discord_id, created_at DESC)')
      ]);
      // Additive compatibility for installations created by r60.
      try {
        await db.prepare("ALTER TABLE user_presence ADD COLUMN avatar TEXT NOT NULL DEFAULT ''").run();
      } catch (error) {
        if (!/duplicate column/i.test(String(error?.message || error))) throw error;
      }
      return true;
    })().catch(error => {
      presenceSchemaPromise = null;
      throw error;
    });
  }
  return presenceSchemaPromise;
}

async function listAuthorizedUsers(env, now = Date.now()) {
  const cutoff = now - ONLINE_WINDOW_MS;
  // Discord OAuth sessions are authoritative for profile pictures. The latest
  // session avatar keeps offline members' cards accurate, while the composite
  // index makes the per-member lookup cheap. Heartbeat presence still controls online state.
  const result = await env.PANTHEON_DB.prepare(`
    SELECT a.discord_id AS id,
           COALESCE(NULLIF(a.label, ''), NULLIF(p.username, ''), 'Discord member') AS label,
           COALESCE(NULLIF(p.username, ''), NULLIF(a.label, ''), '') AS username,
           COALESCE(p.username, a.label, 'Discord member') AS discordName,
           COALESCE(
             (SELECT s.avatar FROM sessions s WHERE s.discord_id = a.discord_id ORDER BY s.created_at DESC LIMIT 1),
             p.avatar,
             ''
           ) AS avatar,
           a.role AS role,
           COALESCE(p.last_seen_at, 0) AS lastSeenAt,
           CASE WHEN p.last_seen_at >= ? THEN 1 ELSE 0 END AS online
    FROM allowed_users a
    LEFT JOIN user_presence p ON p.discord_id = a.discord_id
    WHERE a.enabled = 1
    ORDER BY online DESC, label COLLATE NOCASE ASC
    LIMIT 100
  `).bind(cutoff).all();

  let members = [];
  try { members = (await loadCommunityDirectory(env)).members; } catch (_) {}
  return (result.results || []).map(row => {
    const discordId = String(row.id || '');
    const member = findConfirmedMemberByDiscordId(members, discordId);
    const profile = publicMemberProfile(member, String(row.label || row.discordName || row.username || 'Discord member'));
    const label = String(profile?.pantheonName || row.label || row.discordName || row.username || 'Discord member');
    return {
      id: discordId,
      label,
      username: String(row.username || row.discordName || ''),
      discordName: String(row.discordName || row.label || row.username || 'Discord member'),
      avatar: String(row.avatar || ''),
      role: row.role === 'admin' ? 'admin' : 'member',
      lastSeenAt: Number(row.lastSeenAt) || 0,
      online: Number(row.online) === 1,
      ...(profile || {}),
      canMessage: !!(member && String(member.profileConfirmedDiscordId || '') === discordId)
    };
  });
}

export async function onRequestGet({ env, data }) {
  if (!data?.session) return jsonResponse({ error: 'Authentication required.' }, 401);
  try {
    await ensurePresenceTable(env);
    return jsonResponse({ users: await listAuthorizedUsers(env) });
  } catch (_) {
    return jsonResponse({ error: 'Could not read member presence.' }, 503);
  }
}

export async function onRequestPost({ env, data }) {
  const session = data?.session;
  if (!session?.discordId) return jsonResponse({ error: 'Authentication required.' }, 401);
  try {
    await ensurePresenceTable(env);
    const now = Date.now();
    await env.PANTHEON_DB.prepare(`
      INSERT INTO user_presence (discord_id, username, last_seen_at, avatar) VALUES (?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET
        username = excluded.username,
        last_seen_at = excluded.last_seen_at,
        avatar = excluded.avatar
    `).bind(
      String(session.discordId),
      String(session.username || session.label || '').slice(0,100),
      now,
      String(session.avatar || '').slice(0,200)
    ).run();
    // No roster scan here. Heartbeats only update this member's own presence row.
    return jsonResponse({ ok: true, serverTime: now });
  } catch (_) {
    return jsonResponse({ error: 'Could not update member presence.' }, 503);
  }
}
