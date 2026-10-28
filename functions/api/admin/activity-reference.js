import { jsonResponse, requireAdmin, storeRecord } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';

const MAIN_ID = 'pantheon-main';
const MAX_ACTIVITIES = 100;
const asText = (value, max, fallback = '-') => String(value ?? fallback).trim().slice(0, max);
const slug = value => String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

function cleanActivity(profile, index) {
  const source = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  const rawAliases = Array.isArray(source.aliases) ? source.aliases : String(source.aliases || '').split(',');
  const aliases = [...new Set(rawAliases.map(value => asText(value, 80, '')).filter(Boolean))].slice(0, 20);
  const serviceableValue = String(source.serviceable || 'unknown').toLowerCase();
  return {
    id: slug(source.id || source.name) || `activity-${index + 1}`,
    name: asText(source.name, 100, ''),
    aliases,
    entries: asText(source.entries, 80),
    milestoneGoal: asText(source.milestoneGoal, 180),
    partySize: asText(source.partySize, 50),
    averageRunTime: asText(source.averageRunTime, 80),
    serviceable: ['yes', 'no', 'unknown'].includes(serviceableValue) ? serviceableValue : 'unknown',
    materials: asText(source.materials, 1800),
    weeklyRewards: asText(source.weeklyRewards, 1200),
    recommendation: asText(source.recommendation, 1500, '')
  };
}

async function getDecodedMainRecord(env) {
  const row = await env.PANTHEON_DB.prepare('SELECT id, name, record_json FROM data_records WHERE id = ? LIMIT 1').bind(MAIN_ID).first();
  if (!row) return null;
  let raw;
  try { raw = JSON.parse(row.record_json); } catch (_) { throw new Error('The shared Pantheon main record is corrupt.'); }
  return { row, record: decodePantheonCompactRecord(raw) };
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    const result = await getDecodedMainRecord(context.env);
    if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
    const settings = result.record?.settings || {};
    return jsonResponse({
      activities: Array.isArray(settings.activityReferenceProfiles) ? settings.activityReferenceProfiles : [],
      updatedAt: Number(settings.activityReferenceProfilesUpdatedAt) || 0,
      updatedBy: String(settings.activityReferenceProfilesUpdatedBy || '')
    });
  } catch (error) {
    return jsonResponse({ error: String(error?.message || error).slice(0, 300) }, 500);
  }
}

export async function onRequestPut(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let body;
  try { body = await context.request.json(); } catch (_) { return jsonResponse({ error: 'Expected a JSON request body.' }, 400); }
  if (!Array.isArray(body.activities) || body.activities.length < 1 || body.activities.length > MAX_ACTIVITIES) {
    return jsonResponse({ error: `Activities must be an array containing between 1 and ${MAX_ACTIVITIES} profiles.` }, 400);
  }
  const activities = body.activities.map(cleanActivity);
  if (activities.some(item => !item.name)) return jsonResponse({ error: 'Every activity needs a name.' }, 400);
  const names = new Set();
  for (const item of activities) {
    const key = item.name.toLocaleLowerCase();
    if (names.has(key)) return jsonResponse({ error: `Duplicate activity name: ${item.name}.` }, 400);
    names.add(key);
  }
  if (JSON.stringify(activities).length > 250_000) return jsonResponse({ error: 'Activity reference is too large. Keep the combined profile data below 250 KB.' }, 413);

  try {
    const result = await getDecodedMainRecord(context.env);
    if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
    const record = result.record;
    if (!record || typeof record !== 'object' || !record.settings) return jsonResponse({ error: 'The shared main record has an unexpected structure.' }, 500);
    const now = Date.now();
    record.settings.activityReferenceProfiles = activities;
    record.settings.activityReferenceProfilesUpdatedAt = now;
    record.settings.activityReferenceProfilesUpdatedBy = String(context.data.session.discordId || 'admin');
    record.updatedAt = now;
    await storeRecord(context.env, MAIN_ID, encodePantheonCompactRecord(record), result.row.name || 'Pantheon DN Tracker');
    await context.env.PANTHEON_DB.prepare('INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json) VALUES (?, ?, ?, ?, ?)')
      .bind(context.data.session.discordId, 'admin-activity-reference-update', '', now, JSON.stringify({ activityCount: activities.length, activityNames: activities.map(item => item.name) })).run();
    return jsonResponse({ ok: true, activities, updatedAt: now, updatedBy: String(context.data.session.discordId || 'admin') });
  } catch (error) {
    return jsonResponse({ error: `Activity reference update failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
  }
}
