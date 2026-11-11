# Pantheon Tools v1.6.9-r13 — Tracker task-index registration hotfix

## Base

This hotfix retains the r11-based v1.6.9-r12 Class / Job Catalog package. It does not alter the existing character registration model, roster ownership, Tracker cell storage, or reset logic.

## Fixed

- Dungeon Registration previously wrote a new task into the canonical shared `settings.categories` record but did not update the separate D1 `tracker_task_definitions` allowlist used by per-character cell saves.
- A newly added task could therefore appear in the Tracker while its checkbox save was rejected with HTTP 400: `Task ... is no longer in the current Tracker categories.`
- The registration endpoint now upserts only that task's allowlist row after the category commit. It does not rebuild or rewrite the character-owner index.
- Retrying an already-registered task also repairs a missing/inactive task-index row, without creating a duplicate category/task.
- If the category commit succeeds but the task-index update fails, the API returns an explicit retryable error. The admin can re-submit the same task registration safely.

## Preserved

- r11-based class/job catalog feature and append-only server guard.
- Existing Member Roster registrations, character names, class assignments, Tracker-enabled flags, Main flags, ownership links, Tracker cells, timing history, reset safeguards, and D1 schema.
- No new tables, migrations, database resets, or browser-storage clearing.
- The task-index update is intentionally narrow: it upserts one task definition and does not trigger a full roster/index rebuild.

## Validation

- All inline JavaScript and Pages Function modules passed syntax checks.
- Regression checks verified NFKC/lowercase task-key normalization, the single-row upsert, the idempotent already-registered repair path, and that the registration endpoint does not call the roster-wide `syncCharacterIndexes` function.
- ZIP integrity and deployment file parity were checked.
- No live Cloudflare deployment or production D1 end-to-end test was performed.

## Deployment

Upload the complete ZIP to the existing Cloudflare Pages project. Preserve the existing D1 binding and Discord OAuth/environment settings. Do not reset D1, clear browser storage, or re-register characters.

After deployment, open Admin View → Dungeon Registration and submit the exact same task name (`Black Dragon (Hardcore)`) in the intended category. If it is already present, the endpoint repairs its task-index row without creating a duplicate. Then refresh the Tracker and try the cell again.
