# Deployment instructions — Pantheon Tools v1.6.9-r08

1. Deploy the complete contents of this ZIP to the existing Cloudflare Pages project. The updated `functions/api/cloud/b/[id].js` is required; do not deploy only `index.html`.
2. Keep the existing `PANTHEON_DB` D1 binding, database, Discord OAuth variables, and all other environment settings unchanged.
3. Do not reset D1, recreate the database, clear browser/site storage, or run another Time Travel restore.
4. After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r08`.
5. Hard-refresh with Ctrl+F5. Confirm the existing Member Roster and Universal View are visible and Sync Status no longer reports the `arr is not defined` validation error.
6. Do not add another member until existing data visibility and synchronization are confirmed.

r08 is a surgical Worker hotfix for r07's missing `arr()` helper. It retains the r07 member-level roster protection and legacy Tracker projection behavior. It changes no D1 schema or task-cell data and requires no database reset.

Local syntax, static reference, package-content, and ZIP integrity checks passed. This is not a live Cloudflare deployment or D1 test.
