import { getSession, jsonResponse } from '../_utils/auth.js';

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  if (pathname === '/api/session') return context.next();
  if (!context.env.PANTHEON_DB) return jsonResponse({ error: 'D1 binding PANTHEON_DB is missing.' }, 503);
  const session = await getSession(context.request, context.env);
  if (!session) return jsonResponse({ error: 'Sign in with an approved Discord account first.' }, 401);
  if (pathname.startsWith('/api/admin/') && session.role !== 'admin') return jsonResponse({ error: 'Administrator access required.' }, 403);
  context.data.session = session;
  return context.next();
}
