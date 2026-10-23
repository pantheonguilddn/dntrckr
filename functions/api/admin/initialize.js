import { jsonResponse, requireAdmin, storeRecord } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const exists = await context.env.PANTHEON_DB.prepare('SELECT id FROM data_records WHERE id = ? LIMIT 1').bind('pantheon-main').first();
  if (exists) return jsonResponse({ error: 'A main tracker record already exists. Use the import/migration option or leave the existing data untouched.' }, 409);
  const now = Date.now();
  const starter = {
    schemaVersion: 20,
    updatedAt: now,
    history: {},
    weeklyArchive: {},
    settings: { versionControl: { revisionBinId: '', history: [], versioningEnabled: true } },
    cells: {},
    scholarship: { cheean: { logs: {} }, bio: { logs: {} }, idontheal: { logs: {} } }
  };
  await storeRecord(context.env, 'pantheon-main', starter, 'Pantheon DN Tracker');
  await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, created_at, details_json) VALUES (?, ?, ?, ?)')
    .bind(context.data.session.discordId, 'initialize-empty-tracker', now, '{}').run();
  return jsonResponse({ ok: true, mainRecordId: 'pantheon-main' });
}
