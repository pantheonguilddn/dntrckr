import { getRecord, jsonResponse } from '../_utils/auth.js';
import { decodePantheonCompactRecord } from '../_utils/compact.js';

// Public endpoint intentionally exposes only admin-authored sign-in descriptions.
// It never returns roster, tracker, session, or other shared data to anonymous clients.
export async function onRequestGet(context) {
  const { env } = context;
  if (!env.PANTHEON_DB) return jsonResponse({ error: 'D1 binding PANTHEON_DB is missing.' }, 503);
  try {
    const row = await getRecord(env, 'pantheon-main');
    if (!row) return jsonResponse({ uiCopy: {} });
    const packed = JSON.parse(row.record_json);
    const record = decodePantheonCompactRecord(packed) || {};
    const source = record.settings && typeof record.settings === 'object' ? record.settings.uiCopy : {};
    const input = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    const uiCopy = {};
    for (const [key, value] of Object.entries(input)) {
      if (!key.startsWith('auth.') || key.length > 100) continue;
      const item = value && typeof value === 'object' ? value : {};
      if (typeof item.text !== 'string') continue;
      uiCopy[key] = { text: item.text.slice(0, 1600), updatedAt: Math.max(0, Number(item.updatedAt) || 0) };
    }
    return jsonResponse({ uiCopy });
  } catch (_) {
    return jsonResponse({ error: 'Could not load sign-in copy.' }, 500);
  }
}
