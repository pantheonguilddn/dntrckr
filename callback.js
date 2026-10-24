import { getCookie, jsonResponse, redirectResponse, randomToken, sha256, stateCookie, sessionCookie } from '../../_utils/auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const stateFromCookie = getCookie(request, stateCookie);
  const clearState = `${stateCookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
  if (!env.PANTHEON_DB || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.BOOTSTRAP_ADMIN_DISCORD_ID) {
    return new Response('Pantheon authentication is not configured. Check Pages settings.', { status: 503 });
  }
  if (!code || !state || !stateFromCookie || state !== stateFromCookie) {
    return redirectResponse('/?access=denied&reason=state', [clearState]);
  }
  const stateHash = await sha256(state);
  const stateRow = await env.PANTHEON_DB.prepare('SELECT expires_at FROM oauth_states WHERE state_hash = ? LIMIT 1').bind(stateHash).first();
  await env.PANTHEON_DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(stateHash).run();
  if (!stateRow || Number(stateRow.expires_at) < Date.now()) {
    return redirectResponse('/?access=denied&reason=state', [clearState]);
  }

  const redirectUri = new URL('/auth/discord/callback', request.url).toString();
  let tokenData;
  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: String(env.DISCORD_CLIENT_ID),
        client_secret: String(env.DISCORD_CLIENT_SECRET),
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Discord token exchange failed.');
  } catch (_) {
    return redirectResponse('/?access=denied&reason=oauth', [clearState]);
  }

  let discordUser;
  try {
    const userResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    discordUser = await userResponse.json();
    if (!userResponse.ok || !discordUser.id) throw new Error('Discord identity lookup failed.');
  } catch (_) {
    return redirectResponse('/?access=denied&reason=oauth', [clearState]);
  }

  const discordId = String(discordUser.id);
  const now = Date.now();
  const bootstrapId = String(env.BOOTSTRAP_ADMIN_DISCORD_ID || '').trim();
  if (discordId === bootstrapId) {
    await env.PANTHEON_DB.prepare(`
      INSERT INTO allowed_users (discord_id, label, role, enabled, created_at, created_by)
      VALUES (?, ?, 'admin', 1, ?, 'bootstrap')
      ON CONFLICT(discord_id) DO UPDATE SET role = 'admin', enabled = 1
    `).bind(discordId, String(discordUser.global_name || discordUser.username || 'Pantheon Admin'), now).run();
  }

  const allowed = await env.PANTHEON_DB.prepare('SELECT role, enabled FROM allowed_users WHERE discord_id = ? LIMIT 1').bind(discordId).first();
  if (!allowed || Number(allowed.enabled) !== 1) {
    return redirectResponse('/?access=denied', [clearState]);
  }

  const sessionToken = randomToken();
  const tokenHash = await sha256(sessionToken);
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  const avatar = String(discordUser.avatar || ''); // Store Discord's hash; the client supports hashes and legacy full CDN URLs.
  const username = String(discordUser.global_name || discordUser.username || 'Discord member').slice(0, 100);
  await env.PANTHEON_DB.prepare(`
    INSERT INTO sessions (token_hash, discord_id, username, avatar, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(tokenHash, discordId, username, avatar, expiresAt, now).run();
  await env.PANTHEON_DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run();
  const sessionCookieValue = `${sessionCookie}=${sessionToken}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`;
  return redirectResponse('/', [clearState, sessionCookieValue]);
}
