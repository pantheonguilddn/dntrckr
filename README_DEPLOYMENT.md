# Deployment instructions — Pantheon Tools v1.6.9-r10

1. Deploy the complete contents of this ZIP to the existing Cloudflare Pages project. The updated `index.html`, `version.json`, and `functions/` directory are all required.
2. Keep the existing `PANTHEON_DB` D1 binding, database, Discord OAuth variables, and all other environment settings unchanged.
3. Do not reset D1, recreate the database, clear browser/site storage, or run another Time Travel restore.
4. Confirm `https://dntrckr.pages.dev/version.json` reports build `1.6.9-r10`.
5. Hard-refresh with Ctrl+F5. First inspect Member Roster and Universal View. Do not add a member again until the existing guild characters are visible.
6. If r09 left pending migration upserts in browser storage, r10 treats those legacy upserts as no-ops and acknowledges them safely. They cannot unregister existing Tracker characters. Re-enter only any specific edit that was not committed.

r10 fixes the Member Directory migration / Tracker roster projection bug. Existing Tracker membership is preserved unless the current client explicitly identifies an intentional opt-out or removes a character from that member's registration. Metadata-only changes preserve server-side character registration details and cannot replace them with a stale browser copy.

No D1 schema change is included. Keep the current recovered database. No task-cell or completion-timing data is rewritten by this change.

Validation performed locally: Worker regression tests, JavaScript syntax checks for Pages Functions and all inline app scripts, release marker checks, and ZIP integrity. This is not a live Cloudflare deployment or D1 test.
