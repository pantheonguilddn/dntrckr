# Pantheon Tools v1.6.9-r09

## Admin View authorization / pending-save hotfix

- Fixed an Admin View transition deadlock. Previously, switching Admin View on tried to commit pending shared settings with member-mode permissions before enabling the administrator request header. The Worker correctly rejected edits to other members with HTTP 403, and the UI then refused to enable Admin View because the save remained unconfirmed.
- Admin View now turns on first, refreshes the permission-aware UI, and then retries pending shared settings/member-directory intents using the administrator header.
- If a save is still unconfirmed, Admin View stays enabled and the queued operation remains on the device; the user is told not to repeat Add Member. No local pending intent is discarded.
- Turning Admin View off retains the safe inverse rule: pending character edits and shared settings must be acknowledged while administrator permissions are still active. If not confirmed, Admin View stays on.
- Release auto-refresh now treats pending Member Directory intents as unsent work, preventing a deployment reload from dropping an unacknowledged member operation.
- The Worker authorization rules remain strict. This is a client permission-order fix, not an authorization bypass.

## Deployment

1. Deploy the complete ZIP contents to the existing Cloudflare Pages project, including `functions/api/cloud/b/[id].js`, `index.html`, and `version.json`.
2. Keep the existing D1 database, `PANTHEON_DB` binding, Discord OAuth settings, and environment variables.
3. Do not reset D1, clear browser storage, or run another Time Travel restore.
4. Confirm `/version.json` reports `1.6.9-r09`, then hard-refresh with Ctrl+F5.
5. For a pending administrator roster operation, switch Admin View on once. r09 enables the mode before retrying the queued save. Do not submit Add Member again unless Sync Status confirms the earlier operation or the directory visibly shows it was not committed.

No D1 schema change or migration is required. Local source and package checks are described in the deployment notes; this has not been live-tested against the user's Cloudflare account.
