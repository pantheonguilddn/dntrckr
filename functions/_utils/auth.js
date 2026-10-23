const SESSION_COOKIE = '__Host-pantheon_session';
const STATE_COOKIE = '__Host-pantheon_oauth_state';

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    }
  });
}

export function redirectResponse(url, cookies = []) {
  const headers = new Headers({ Location: url, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

export function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function randomToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
}

export const sessionCookie = SESSION_COOKIE;
export const stateCookie = STATE_COOKIE;

export async function getSession(request, env) {
  if (!env?.PANTHEON_DB) return null;
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const row = await env.PANTHEON_DB.prepare(`
    SELECT s.discord_id, s.username, s.avatar, s.expires_at, a.role, a.label
    FROM sessions s
    JOIN allowed_users a ON a.discord_id = s.discord_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND a.enabled = 1
    LIMIT 1
  `).bind(tokenHash, now).first();
  if (!row) return null;
  return {
    discordId: String(row.discord_id),
    username: String(row.username || row.label || 'Discord member'),
    avatar: String(row.avatar || ''),
    role: row.role === 'admin' ? 'admin' : 'member',
    expiresAt: Number(row.expires_at) || 0
  };
}

export async function requireAdmin(context) {
  const session = context.data?.session || await getSession(context.request, context.env);
  if (!session) return jsonResponse({ error: 'Authentication required.' }, 401);
  if (session.role !== 'admin') return jsonResponse({ error: 'Administrator access required.' }, 403);
  context.data.session = session;
  return null;
}

export async function resolveRecordId(env, requestedId) {
  const id = String(requestedId || '').trim();
  if (!id || id.length > 200) return '';
  const alias = await env.PANTHEON_DB.prepare('SELECT target_id FROM record_aliases WHERE alias_id = ? LIMIT 1').bind(id).first();
  return String(alias?.target_id || id);
}

export async function storeRecord(env, id, record, name = '') {
  const now = Date.now();
  const recordJson = JSON.stringify(record);
  if (recordJson.length > 2_000_000) throw new Error('Record is too large for the Pantheon storage API.');
  await env.PANTHEON_DB.prepare(`
    INSERT INTO data_records (id, name, record_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, record_json = excluded.record_json, updated_at = excluded.updated_at
  `).bind(id, String(name || ''), recordJson, now, now).run();
}

export async function getRecord(env, requestedId) {
  const id = await resolveRecordId(env, requestedId);
  if (!id) return null;
  return env.PANTHEON_DB.prepare('SELECT id, name, record_json, created_at, updated_at FROM data_records WHERE id = ? LIMIT 1').bind(id).first();
}
