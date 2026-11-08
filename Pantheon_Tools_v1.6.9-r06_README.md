# Pantheon Tools v1.6.9-r06

## Member Roster data-loss protection

- Replaced implicit whole-list Member Directory writes with explicit per-member `add`, `upsert`, and `remove` intents across Member Roster edits, Discord confirmation, Tracker opt-in, character unregister, roster order/color, class edits, and legacy roster migration.
- The client stores pending Member Roster intents in a small local outbox and removes them only after the matching shared Tracker save is acknowledged.
- The server applies those intents against the latest D1 `data_records` snapshot inside its existing compare-and-swap write loop. Adding one member therefore preserves every other member as currently stored in D1, even when the browser's cached roster is incomplete or stale.
- Editing or removing a member is similarly scoped to the selected member ID. Existing member entries are not replaced by the rest of a stale local list.
- Whole-record writes that change the set of member IDs without a matching explicit member-level intent are rejected with HTTP 409 before the record or ownership index is changed. Even when IDs match, ordinary syncs preserve the server's canonical Member Directory, Tracker roster projection, and class map instead of accepting stale profile details.
- After a valid intent, the server rebuilds the Tracker roster projection from the canonical merged directory and then refreshes the character ownership index.
- Existing character task cells and completion timing remain in their existing D1 tables; this release adds no schema migration and does not rewrite progress rows.

## Deployment

Deploy the complete Cloudflare Pages bundle. The `functions/api/cloud/b/[id].js` update is required; deploying only the HTML file is not sufficient. Keep the current D1 binding, Discord OAuth configuration, and other environment variables. Do not reset D1 or clear browser storage.

Local validation completed: JavaScript syntax checks passed for the Worker route and inline app scripts. A focused logic test verified that Add retains all previous member entries, Upsert changes only the targeted member, Remove removes only the targeted member, and roster projection preserves unrelated members. No live Cloudflare deployment or live D1 test was performed.
