import { getRecord, jsonResponse, requireAdmin } from '../../_utils/auth.js';
import { decodePantheonCompactRecord, encodePantheonCompactRecord } from '../../_utils/compact.js';
import { isCharacterStorageMigrationBusy } from '../../_utils/character-storage.js';

const MAIN_ID = 'pantheon-main';
const clean = (value, limit) => String(value ?? '').trim().slice(0, limit);
const safeColor = value => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : '#ffffff';
const uniqueTasks = categories => [...new Set((Array.isArray(categories) ? categories : []).flatMap(category => Array.isArray(category?.tasks) ? category.tasks : []).map(value => clean(value, 140)).filter(Boolean).map(value => value.toLocaleLowerCase()))];

const slug = value => String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const normalizeMatch = value => String(value || '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
function ensureActivityProfile(settings, taskName) {
  const profiles = Array.isArray(settings.activityReferenceProfiles) ? settings.activityReferenceProfiles.map(item => ({ ...item })) : [];
  const target = normalizeMatch(taskName);
  const index = profiles.findIndex(profile => [profile.name, ...(Array.isArray(profile.aliases) ? profile.aliases : String(profile.aliases || '').split(','))].some(value => normalizeMatch(value) === target));
  if (index >= 0) return { profiles, changed: false };
  if (profiles.length >= 200) throw new Error('The activity details catalogue is full (200 entries). Remove an obsolete profile before registering another dungeon.');
  profiles.push({ id: slug(taskName) || `activity-${Date.now().toString(36)}`, name: taskName, aliases: [], entries: '-', milestoneGoal: '-', partySize: '-', averageRunTime: '-', serviceable: 'unknown', materials: '-', weeklyRewards: '-', recommendation: '' });
  return { profiles, changed: true };
}

async function readMainRecord(env) {
  const row = await getRecord(env, MAIN_ID);
  if (!row) return null;
  let packed;
  try { packed = JSON.parse(row.record_json); }
  catch (_) { throw new Error('The shared Pantheon main record is corrupt.'); }
  const record = decodePantheonCompactRecord(packed);
  if (!record || typeof record !== 'object' || !record.settings || typeof record.settings !== 'object') {
    throw new Error('The shared Pantheon main record has an unexpected structure.');
  }
  return { row, record };
}

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (context.request.headers.get('X-Pantheon-Admin-Mode') !== '1') {
    return jsonResponse({ error: 'Turn on Admin View before registering guild-wide dungeon tasks.' }, 403);
  }
  if (await isCharacterStorageMigrationBusy(context.env)) {
    return jsonResponse({ code: 'CHARACTER_STORAGE_MIGRATION_BUSY', retryable: true, error: 'Dungeon registration is temporarily paused while player storage is being migrated.' }, 503);
  }

  let body;
  try { body = await context.request.json(); }
  catch (_) { return jsonResponse({ error: 'Expected a JSON request body.' }, 400); }
  const taskName = clean(body.taskName, 40);
  const categoryId = clean(body.categoryId, 80);
  const categoryName = clean(body.categoryName, 30);
  const group = body.group === 'Dailies' ? 'Dailies' : 'Weeklies';
  const color = safeColor(body.color);
  const excludeByDefault = body.excludeByDefault === true;
  if (!taskName) return jsonResponse({ error: 'Enter a dungeon task name.' }, 400);
  if (!categoryId && !categoryName) return jsonResponse({ error: 'Choose an existing category or enter a new category name.' }, 400);

  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const result = await readMainRecord(context.env);
      if (!result) return jsonResponse({ error: 'The shared Pantheon main record has not been initialized.' }, 404);
      const settings = result.record.settings;
      const categories = Array.isArray(settings.categories) ? settings.categories.map(category => ({
        ...category,
        id: clean(category?.id, 80),
        name: clean(category?.name || 'Registered dungeons', 30),
        group: category?.group === 'Dailies' ? 'Dailies' : 'Weeklies',
        color: safeColor(category?.color),
        tasks: Array.isArray(category?.tasks) ? category.tasks.map(value => clean(value, 140)).filter(Boolean) : []
      })) : [];

      const duplicateCategory = categories.find(item => item.tasks.some(value => String(value).trim().toLocaleLowerCase() === taskName.toLocaleLowerCase()));
      let category = categoryId ? categories.find(item => item.id === categoryId) : null;
      if (categoryId && !category) {
        // A cached browser can hold a category ID from before an admin-side category
        // refresh/repair. Resolve only by the exact visible name and reset group; do not
        // create a duplicate or attach the task to an unrelated category.
        const requestedName = clean(categoryName, 30).toLocaleLowerCase();
        const sameName = requestedName
          ? categories.filter(item => item.name.toLocaleLowerCase() === requestedName)
          : [];
        const sameGroup = sameName.filter(item => item.group === group);
        category = sameGroup.length === 1 ? sameGroup[0] : (sameGroup.length === 0 && sameName.length === 1 ? sameName[0] : null);
        if (!category) {
          return jsonResponse({
            code: 'DUNGEON_CATEGORY_STALE',
            error: sameName.length > 1
              ? `The selected category ID changed and more than one category is named \"${clean(categoryName, 30)}\". Reload Dungeon Registration and select the intended category again.`
              : `The selected category \"${clean(categoryName, 30) || 'Unknown'}\" could not be matched on the shared server. Reload Dungeon Registration and try again.`
          }, 409);
        }
      }
      if (!category && duplicateCategory) category = duplicateCategory;
      if (!category) {
        // Reuse a matching category if another admin created it concurrently.
        category = categories.find(item => item.name.toLocaleLowerCase() === categoryName.toLocaleLowerCase() && item.group === group);
        if (!category) {
          let id = `cat-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
          while (categories.some(item => item.id === id)) id = `cat-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
          category = { id, group, name: categoryName, color, tasks: [] };
          categories.push(category);
        }
      }

      const alreadyRegistered = !!duplicateCategory;
      if (!alreadyRegistered) category.tasks.push(taskName);
      const registrationCategory = duplicateCategory || category;
      // Match the Tracker's isBountyListTask() rule: a claim row is identified by
      // belonging to a Bounty-named category, not by the word "Bounty" appearing
      // anywhere in a dungeon's display name. A real dungeon such as
      // "Desert Dragon Memoria [Bounty]" may still use the default-N/A policy.
      const isBountyTask = /bounty/i.test(String(registrationCategory?.name || ''));
      if (excludeByDefault && isBountyTask) return jsonResponse({ error: 'Bounty Board claim rows cannot be excluded by default. Apply the default N/A policy to the dungeon task instead.' }, 400);

      const profileResult = ensureActivityProfile(settings, taskName);
      const categoriesChanged = !alreadyRegistered;
      const profilesChanged = profileResult.changed;
      const existingDefaultExcluded = Array.isArray(settings.defaultExcludedTasks) ? settings.defaultExcludedTasks : [];
      const existingExtraDungeons = Array.isArray(settings.extraDungeonTasks) ? settings.extraDungeonTasks : [];
      const isAlreadyDefaultExcluded = existingDefaultExcluded.some(value => String(value || '').trim().toLocaleLowerCase() === taskName.toLocaleLowerCase());
      const isAlreadyExtraDungeon = existingExtraDungeons.some(value => String(value || '').trim().toLocaleLowerCase() === taskName.toLocaleLowerCase());
      const defaultExcludedTasks = [...existingDefaultExcluded];
      const extraDungeonTasks = [...existingExtraDungeons];
      const defaultExclusionChanged = excludeByDefault && !isAlreadyDefaultExcluded;
      const extraDungeonChanged = excludeByDefault && !isAlreadyExtraDungeon;
      if (defaultExclusionChanged) defaultExcludedTasks.push(taskName);
      if (extraDungeonChanged) extraDungeonTasks.push(taskName);
      if (!categoriesChanged && !profilesChanged && !defaultExclusionChanged && !extraDungeonChanged) {
        return jsonResponse({
          ok: true,
          alreadyRegistered: true,
          taskName,
          categoryId: duplicateCategory.id,
          categories,
          activityReferenceProfiles: Array.isArray(settings.activityReferenceProfiles) ? settings.activityReferenceProfiles : [],
          categoriesUpdatedAt: Number(settings.categoriesUpdatedAt) || 0,
          categoriesUpdatedBy: String(settings.categoriesUpdatedBy || ''),
          activityReferenceProfilesUpdatedAt: Number(settings.activityReferenceProfilesUpdatedAt) || 0,
          activityReferenceProfilesUpdatedBy: String(settings.activityReferenceProfilesUpdatedBy || ''),
          defaultExcludedTasks: existingDefaultExcluded,
          defaultExcludedTasksUpdatedAt: Number(settings.defaultExcludedTasksUpdatedAt) || 0,
          defaultExcludedTasksUpdatedBy: String(settings.defaultExcludedTasksUpdatedBy || ''),
          extraDungeonTasks: existingExtraDungeons,
          extraDungeonTasksUpdatedAt: Number(settings.extraDungeonTasksUpdatedAt) || 0,
          extraDungeonTasksUpdatedBy: String(settings.extraDungeonTasksUpdatedBy || ''),
          recordUpdatedAt: Number(result.row.updated_at) || Number(result.record.updatedAt) || 0,
          sourceRecordId: result.row.id
        });
      }

      const now = Date.now();
      if (categoriesChanged) {
        settings.categories = categories;
        settings.categoriesUpdatedAt = now;
        settings.categoriesUpdatedBy = String(context.data.session.discordId || 'admin');
      }
      if (profilesChanged) {
        settings.activityReferenceProfiles = profileResult.profiles;
        settings.activityReferenceProfilesUpdatedAt = now;
        settings.activityReferenceProfilesUpdatedBy = String(context.data.session.discordId || 'admin');
      }
      if (defaultExclusionChanged || extraDungeonChanged) {
        settings.defaultExcludedTasks = defaultExcludedTasks;
        settings.defaultExcludedTasksUpdatedAt = now;
        settings.defaultExcludedTasksUpdatedBy = String(context.data.session.discordId || 'admin');
      }
      if (extraDungeonChanged) {
        settings.extraDungeonTasks = extraDungeonTasks;
        settings.extraDungeonTasksUpdatedAt = now;
        settings.extraDungeonTasksUpdatedBy = String(context.data.session.discordId || 'admin');
      }
      result.record.updatedAt = now;
      const packed = encodePantheonCompactRecord(result.record);
      const recordJson = JSON.stringify(packed);
      if (recordJson.length > 2_000_000) return jsonResponse({ error: 'The shared Pantheon record is too large to update.' }, 413);
      const update = await context.env.PANTHEON_DB.prepare(
        'UPDATE data_records SET record_json = ?, updated_at = ? WHERE id = ? AND record_json = ?'
      ).bind(recordJson, now, result.row.id, result.row.record_json).run();
      const changes = Number(update?.meta?.changes ?? update?.changes ?? 0);
      if (changes < 1) continue;

      try {
        await context.env.PANTHEON_DB.prepare(
          'INSERT INTO audit_events (actor_discord_id, action, target_discord_id, created_at, details_json) VALUES (?, ?, ?, ?, ?)'
        ).bind(context.data.session.discordId, 'admin-dungeon-task-register', '', now, JSON.stringify({ taskName, categoryId: category.id, categoryName: category.name, group, activityProfileCreated: profilesChanged, excludedFromCalculationsByDefault: isAlreadyDefaultExcluded || defaultExclusionChanged || isAlreadyExtraDungeon || extraDungeonChanged })).run();
      } catch (_) { /* The durable D1 category/profile update is authoritative; audit logging is secondary. */ }

      return jsonResponse({
        ok: true,
        alreadyRegistered,
        taskName,
        categoryId: alreadyRegistered ? duplicateCategory.id : category.id,
        categories,
        activityReferenceProfiles: Array.isArray(settings.activityReferenceProfiles) ? settings.activityReferenceProfiles : profileResult.profiles,
        categoriesUpdatedAt: Number(settings.categoriesUpdatedAt) || 0,
        categoriesUpdatedBy: String(settings.categoriesUpdatedBy || ''),
        activityReferenceProfilesUpdatedAt: Number(settings.activityReferenceProfilesUpdatedAt) || 0,
        activityReferenceProfilesUpdatedBy: String(settings.activityReferenceProfilesUpdatedBy || ''),
        defaultExcludedTasks: Array.isArray(settings.defaultExcludedTasks) ? settings.defaultExcludedTasks : [],
        defaultExcludedTasksUpdatedAt: Number(settings.defaultExcludedTasksUpdatedAt) || 0,
        defaultExcludedTasksUpdatedBy: String(settings.defaultExcludedTasksUpdatedBy || ''),
        extraDungeonTasks: Array.isArray(settings.extraDungeonTasks) ? settings.extraDungeonTasks : [],
        extraDungeonTasksUpdatedAt: Number(settings.extraDungeonTasksUpdatedAt) || 0,
        extraDungeonTasksUpdatedBy: String(settings.extraDungeonTasksUpdatedBy || ''),
        recordUpdatedAt: now,
        sourceRecordId: result.row.id
      });
    } catch (error) {
      return jsonResponse({ error: `Dungeon registration failed: ${String(error?.message || error).slice(0, 300)}` }, 500);
    }
  }
  return jsonResponse({ error: 'The shared record changed during every save attempt. Reload Dungeon Registration and try again.' }, 409);
}
