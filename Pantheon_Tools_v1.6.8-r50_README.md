# Pantheon Tools v1.6.8-r50 — storage initialization order and queued-save safety

## What changed

- Runs the one-time owner-scoped player-storage provision/migration for administrators before the initial Tracker whole-record sync.
- Regular members check the storage readiness marker before syncing. Until an administrator completes setup, members can view the preserved legacy Tracker, but ordinary cloud writes are paused.
- Character checkbox/note edits remain in the local pending queue while player storage is unavailable. They are not repeatedly sent to a table that has not yet been initialized.
- Retries resume only after the authenticated status endpoint reports `characterStorageReady: true`.
- When setup fails, the administrator sees the actual migration/setup error instead of only the generic character-save warning.
- Keeps owner-scoped character/task storage, Universal View aggregation, Admin Mode ownership override, and legacy backup behavior from r49.

## Deploy

Upload the complete ZIP contents to the existing Cloudflare Pages project. Preserve the existing D1 binding and Discord/OAuth environment settings. No separate SQL step, migration button, or database reset is required. The first administrator sign-in initializes and migrates player storage. Members should reload after the administrator's setup succeeds.

## Recovery and safety

The original `pantheon-main` record remains the migration/recovery source. Pending local character edits are retained in the browser until the storage readiness check succeeds. If the migration endpoint reports an error, resolve that specific error before retrying; do not clear browser storage or delete the legacy record.

## Validation

JavaScript syntax, CSS parsing, HTML duplicate-ID checks, package integrity, version-manifest consistency, startup call-order checks, and readiness-gated retry behavior checked locally. Live Cloudflare Pages/D1 migration and multi-account tests are still required after deployment.
