import { getCookie, jsonResponse, sha256, sessionCookie } from '../_utils/auth.js';

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, sessionCookie);
  if (token && env.PANTHEON_DB) {
    const hash = await sha256(token);
    await env.PANTHEON_DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
  }
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': `${sessionCookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
}
