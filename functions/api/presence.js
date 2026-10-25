import { jsonResponse } from '../_utils/auth.js';

const ONLINE_WINDOW_MS = 90_000;
async function ensurePresenceTable(env) {
  await env.PANTHEON_DB.prepare(`CREATE TABLE IF NOT EXISTS user_presence (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    last_seen_at INTEGER NOT NULL
  )`).run();
}

// Return every currently enabled Pantheon account so the UI can distinguish online and offline.
// Online requires both a recent heartbeat and a valid, unexpired session.
async function listAuthorizedUsers(env, now = Date.now()) {
  const cutoff = now - ONLINE_WINDOW_MS;
  const result = await env.PANTHEON_DB.prepare(`
    SELECT a.discord_id AS id,
           COALESCE(NULLIF(a.label, ''), NULLIF(p.username, ''), 'Discord member') AS label,
           COALESCE(NULLIF(p.username, ''), '') AS username,
           a.role AS role,
           COALESCE(p.last_seen_at, 0) AS lastSeenAt,
           CASE WHEN p.last_seen_at >= ?
                     AND EXISTS (SELECT 1 FROM sessions s WHERE s.discord_id = a.discord_id AND s.expires_at > ?)
                THEN 1 ELSE 0 END AS online
    FROM allowed_users a
    LEFT JOIN user_presence p ON p.discord_id = a.discord_id
    WHERE a.enabled = 1
    ORDER BY online DESC, label COLLATE NOCASE ASC
    LIMIT 100
  `).bind(cutoff, now).all();
  return (result.results || []).map(row => ({
    id: String(row.id || ''),
    label: String(row.label || row.username || 'Discord member'),
    username: String(row.username || ''),
    role: row.role === 'admin' ? 'admin' : 'member',
    lastSeenAt: Number(row.lastSeenAt) || 0,
    online: Number(row.online) === 1
  }));
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
      INSERT INTO user_presence (discord_id, username, last_seen_at) VALUES (?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET username = excluded.username, last_seen_at = excluded.last_seen_at
    `).bind(String(session.discordId), String(session.username || session.label || '').slice(0,100), now).run();
    // Keep recent history only; enabled accounts without a recent heartbeat remain visible as offline.
    await env.PANTHEON_DB.prepare('DELETE FROM user_presence WHERE last_seen_at < ?').bind(now - 7 * 24 * 60 * 60 * 1000).run();
    return jsonResponse({ ok: true, users: await listAuthorizedUsers(env, now) });
  } catch (_) {
    return jsonResponse({ error: 'Could not update member presence.' }, 503);
  }
}
