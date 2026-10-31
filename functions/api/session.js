import { getSession, jsonResponse } from '../_utils/auth.js';

export async function onRequestGet({ request, env }) {
  if (!env.PANTHEON_DB) return jsonResponse({ authenticated: false, setupRequired: true, error: 'D1 binding PANTHEON_DB is missing.' }, 503);
  try {
    const session = await getSession(request, env);
    if (!session) return jsonResponse({ authenticated: false });
    return jsonResponse({ authenticated: true, user: { id: session.discordId, username: session.username, label: session.label, avatar: session.avatar, role: session.role, isBootstrapAdmin: session.isBootstrapAdmin === true, personalOwnerName: String(session.personalOwnerName || '') } });
  } catch (_) {
    return jsonResponse({ authenticated: false, setupRequired: true, error: 'Authentication service unavailable.' }, 503);
  }
}
