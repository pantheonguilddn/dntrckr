import { jsonResponse, requireAdmin, storeRecord } from '../../_utils/auth.js';

const MAIN_ID = 'pantheon-main';
const REVISION_ID = 'pantheon-revisions';

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let body;
  try { body = await context.request.json(); } catch (_) { return jsonResponse({ error: 'Expected JSON request body.' }, 400); }
  const mainRecord = body.mainRecord;
  const revisionRecord = body.revisionRecord;
  if (!mainRecord || typeof mainRecord !== 'object' || Array.isArray(mainRecord)) return jsonResponse({ error: 'The source main record is missing or invalid.' }, 400);
  const sourceMainBinId = String(body.sourceMainBinId || '').trim();
  const sourceRevisionBinId = String(body.sourceRevisionBinId || '').trim();
  try {
    await storeRecord(context.env, MAIN_ID, mainRecord, 'Pantheon DN Tracker');
    if (sourceMainBinId && sourceMainBinId !== MAIN_ID) {
      await context.env.PANTHEON_DB.prepare(`INSERT INTO record_aliases(alias_id, target_id) VALUES (?, ?) ON CONFLICT(alias_id) DO UPDATE SET target_id=excluded.target_id`).bind(sourceMainBinId, MAIN_ID).run();
    }
    if (revisionRecord && typeof revisionRecord === 'object' && !Array.isArray(revisionRecord)) {
      await storeRecord(context.env, REVISION_ID, revisionRecord, 'Pantheon DN Revision Journal');
      if (sourceRevisionBinId && sourceRevisionBinId !== REVISION_ID) {
        await context.env.PANTHEON_DB.prepare(`INSERT INTO record_aliases(alias_id, target_id) VALUES (?, ?) ON CONFLICT(alias_id) DO UPDATE SET target_id=excluded.target_id`).bind(sourceRevisionBinId, REVISION_ID).run();
      }
    }
    await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, created_at, details_json) VALUES (?, ?, ?, ?)')
      .bind(context.data.session.discordId, 'jsonbin-migration', Date.now(), JSON.stringify({ sourceMainBinId, sourceRevisionBinId, importedRevisionRecord: !!revisionRecord })).run();
    return jsonResponse({ ok: true, mainRecordId: MAIN_ID, revisionRecordId: revisionRecord ? REVISION_ID : null, sourceMainBinId, sourceRevisionBinId });
  } catch (error) {
    return jsonResponse({ error: `Migration failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
  }
}
