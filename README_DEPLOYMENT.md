# Deployment instructions — Pantheon Tools v1.6.9-r07

1. Deploy the complete contents of this ZIP to the existing Cloudflare Pages project. The updated `functions/api/cloud/b/[id].js` is required; do not deploy only `index.html`.
2. Keep the existing `PANTHEON_DB` D1 binding, database, Discord OAuth variables, and all other environment settings unchanged.
3. Do not reset D1, recreate the database, clear browser/site storage, or run another Time Travel restore.
4. After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r07`.
5. Hard-refresh with Ctrl+F5. First verify the existing Member Roster and Universal View. Do not add a test member until all previously registered members are visible.
6. If records remain hidden, stop and inspect `character_owners`; do not repeat Add Member or attempt another rollback.

r07 fixes legacy Tracker projection: when one member is added or edited, every unedited member retains their existing Tracker character list. Only the explicitly edited member's submitted opt-in flags can change that member's Tracker registration. It retains r06's server-side per-member intents and rejects unsafe whole-directory replacements.

No D1 schema migration or reset is required. Local syntax and focused projection checks were completed. This is not a live Cloudflare deployment or D1 test.
