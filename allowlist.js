import { jsonResponse, requireAdmin } from '../../_utils/auth.js';

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const { results = [] } = await context.env.PANTHEON_DB.prepare(`
    SELECT discord_id, label, role, enabled, created_at, created_by
    FROM allowed_users ORDER BY role DESC, label COLLATE NOCASE, discord_id
  `).all();
  return jsonResponse({ users: results });
}

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let body;
  try { body = await context.request.json(); } catch (_) { return jsonResponse({ error: 'Expected JSON request body.' }, 400); }
  const discordId = String(body.discordId || '').trim();
  const label = String(body.label || '').trim().slice(0, 100);
  if (!/^\d{17,20}$/.test(discordId)) return jsonResponse({ error: 'Enter a valid numeric Discord user ID (17–20 digits). Do not use a username.' }, 400);
  if (discordId === String(context.env.BOOTSTRAP_ADMIN_DISCORD_ID || '')) {
    await context.env.PANTHEON_DB.prepare(`
      INSERT INTO allowed_users (discord_id, label, role, enabled, created_at, created_by)
      VALUES (?, ?, 'admin', 1, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET role = 'admin', enabled = 1, label = excluded.label
    `).bind(discordId, label || 'Pantheon Admin', Date.now(), context.data.session.discordId).run();
  } else {
    await context.env.PANTHEON_DB.prepare(`
      INSERT INTO allowed_users (discord_id, label, role, enabled, created_at, created_by)
      VALUES (?, ?, 'member', 1, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET label = excluded.label, enabled = 1
    `).bind(discordId, label, Date.now(), context.data.session.discordId).run();
  }
  await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json) VALUES (?, ?, ?, ?, ?)')
    .bind(context.data.session.discordId, 'allowlist-add-or-enable', discordId, Date.now(), JSON.stringify({ label })).run();
  return jsonResponse({ ok: true, discordId });
}

export async function onRequestDelete(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const url = new URL(context.request.url);
  const discordId = String(url.searchParams.get('discordId') || '').trim();
  if (!/^\d{17,20}$/.test(discordId)) return jsonResponse({ error: 'Supply a valid Discord user ID in ?discordId=.' }, 400);
  if (discordId === String(context.env.BOOTSTRAP_ADMIN_DISCORD_ID || '')) return jsonResponse({ error: 'The bootstrap administrator cannot be removed from the allowlist. Change the Cloudflare secret first if you need to transfer ownership.' }, 400);
  const target = await context.env.PANTHEON_DB.prepare('SELECT role FROM allowed_users WHERE discord_id = ? AND enabled = 1').bind(discordId).first();
  if (!target) return jsonResponse({ error: 'That account is not currently enabled.' }, 404);
  if (target.role === 'admin') {
    const admins = await context.env.PANTHEON_DB.prepare("SELECT COUNT(*) AS n FROM allowed_users WHERE role = 'admin' AND enabled = 1").first();
    if (Number(admins?.n || 0) <= 1) return jsonResponse({ error: 'The last active administrator cannot be removed.' }, 400);
  }
  await context.env.PANTHEON_DB.prepare('UPDATE allowed_users SET enabled = 0 WHERE discord_id = ?').bind(discordId).run();
  await context.env.PANTHEON_DB.prepare('DELETE FROM sessions WHERE discord_id = ?').bind(discordId).run();
  await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(context.data.session.discordId, 'allowlist-disable', discordId, Date.now()).run();
  return jsonResponse({ ok: true, discordId });
}
