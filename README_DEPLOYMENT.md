# Deployment instructions — Pantheon Tools v1.6.9-r09

1. Deploy the complete contents of this ZIP to the existing Cloudflare Pages project. The updated `index.html`, `version.json`, and `functions/` directory are required.
2. Keep the existing `PANTHEON_DB` D1 binding, database, Discord OAuth variables, and all other environment settings unchanged.
3. Do not reset D1, recreate the database, clear browser/site storage, or run another Time Travel restore.
4. Confirm `https://dntrckr.pages.dev/version.json` reports build `1.6.9-r09`.
5. Hard-refresh with Ctrl+F5. Review the existing Member Roster and Universal View before attempting another new-member save.
6. If a Member Directory save is queued, switch Admin View on once. r09 enables administrator mode before retrying the queued shared save. Do not click Add Member a second time while the earlier operation is unconfirmed.

r09 fixes the Admin View transition deadlock that caused an administrator's queued Member Roster save to be retried with member-mode permissions and rejected with HTTP 403. The server-side ownership checks remain enabled. Pending Member Directory intents also prevent automatic update reloads until acknowledged. No D1 schema or task-cell changes are included.

Validation performed locally: source syntax, release marker, permission-order static check, and deployment ZIP integrity. This is not a live Cloudflare deployment or D1 test.
