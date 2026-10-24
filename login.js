import { jsonResponse, redirectResponse, randomToken, sha256, stateCookie, sessionCookie } from '../../_utils/auth.js';

export async function onRequestGet({ request, env }) {
  if (!env.PANTHEON_DB || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.BOOTSTRAP_ADMIN_DISCORD_ID) {
    return new Response('Pantheon authentication is not configured. Check the Pages D1 binding and DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and BOOTSTRAP_ADMIN_DISCORD_ID settings.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const state = randomToken();
  const stateHash = await sha256(state);
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await env.PANTHEON_DB.prepare('INSERT INTO oauth_states (state_hash, expires_at) VALUES (?, ?)').bind(stateHash, expiresAt).run();
  const callbackUrl = new URL('/auth/discord/callback', request.url).toString();
  const params = new URLSearchParams({
    client_id: String(env.DISCORD_CLIENT_ID),
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'identify',
    state
  });
  const cookies = [
    `${stateCookie}=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    `${sessionCookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
  ];
  return redirectResponse(`https://discord.com/oauth2/authorize?${params.toString()}`, cookies);
}
