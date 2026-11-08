# Deployment instructions — Pantheon Tools v1.6.9-r06

1. Keep the existing Cloudflare Pages project and D1 database. This release does not require a D1 schema migration.
2. Deploy the complete contents of this ZIP to the existing Cloudflare Pages project. Do not deploy only `index.html`; the server-side safety changes in `functions/api/cloud/b/[id].js` are required.
3. Keep the existing `PANTHEON_DB` D1 binding, Discord OAuth variables, and all other environment settings unchanged.
4. Do not reset D1, recreate the database, clear browser/site storage, or run another Time Travel restore as part of this deployment.
5. After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r06`.
6. Hard-refresh the app (Ctrl+F5) so the browser loads the matching r06 front end. Do not clear site storage.
7. Confirm the Member Roster and Universal View show the existing guild members before making another roster change. Then add one test member and verify that all existing members and their progress remain visible.

## What changed

- Member Roster Add / Edit / Remove actions, Discord confirmation, Tracker opt-in, character unregister, roster order/color, and class edits now send explicit member-level operations. The server applies each operation to the latest D1 roster instead of accepting a browser's entire cached member list as authoritative.
- A stale/incomplete browser roster that tries to add or remove member IDs without an explicit safe operation is rejected with HTTP 409. Even when member IDs match, ordinary whole-record syncs cannot replace canonical member profiles, roster projections, or class assignments.
- The server rebuilds the Tracker roster projection from the preserved, current member directory after applying the member-level operation.
- Pending member operations are kept in the browser outbox and cleared only after the server confirms the corresponding sync.
- No D1 tables are created, altered, cleared, or migrated by this release.

Local syntax and focused logic tests passed. This is not a live Cloudflare deployment or live D1 test; production behavior still needs the controlled post-deploy verification above.
