# Pantheon Tools v1.6.8-r49 — one-package update

## Deploy

1. Keep a copy of your currently working Pages deployment as rollback.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project.
3. Keep the existing `PANTHEON_DB` D1 binding, Discord OAuth settings, environment variables, and project configuration unchanged.
4. Open the app and sign in with the administrator Discord account. On the first administrator startup, Pantheon automatically creates the additional player-storage tables and imports the existing Tracker data. No separate SQL-console step and no migration button are required.
5. Confirm the app reports **Player storage is ready**, then test one administrator-owned character and one other member's character before asking the guild to return.

## Safety

- The original `pantheon-main` Tracker record is backed up in D1 before the import.
- Existing roster, settings, task cells, and completion timing are copied into owner-scoped tables.
- The migration is protected by a tokenized lock and can be safely retried if interrupted.
- Character saves are written to the affected character/task rows; they no longer rewrite the whole guild Tracker JSON.
- Universal View is aggregated and read-only for non-admins. Admin View is required for cross-owner edits.
- Do not delete the existing D1 database or its `pantheon-main` record.

## Validation boundary

Local syntax, SQLite-backed migration, ownership, aggregation, concurrent player-save, and package-integrity tests are run for this build. This is not a live Cloudflare Pages/D1 multi-account deployment test; verify the two-account workflow on production before guild-wide use.
