# Pantheon Tools v1.6.8-r41 — personal/admin isolation and navigation freshness

## What changed

- The authenticated administrator starts in the confirmed Member Roster identity (Cho for the currently linked Discord account) and Personal View. The visible **Admin View** toggle explicitly enables guild-wide management and cross-character editing. Returning to Personal View first confirms pending administrator writes.
- Admin-role sessions no longer bypass character ownership checks unless the administrator explicitly enables Admin View. This is enforced by both the per-character cell endpoint and the whole-record D1 write endpoint. A request header alone cannot grant administrator rights; the server also requires the authenticated Discord session to have the Admin role.
- In Personal View, client-side whole-record sync preserves every non-owned character cell and weekly archive entry from the authoritative server snapshot. The D1 write guard independently rejects unauthorized changes to other members’ progress, registration, roster, class records, or reset markers.
- Confirmed Discord account ID is the first-choice mapping to the canonical Member Roster owner and Tracker roster. Discord display-name/username differences therefore do not divert the Admin account away from its linked Cho profile. Duplicate confirmed ID links fail closed.
- Every in-app page navigation performs a forced no-store D1 revision and record read, then triggers a `/version.json` check. Normal five-second Tracker / sixty-second non-Tracker polling, focus refresh, and pending-write-safe automatic release reload remain active.
- D1 status responses include server time. The client calibrates reset calculations to the D1 server epoch; task cell timestamps and conflict ordering are stamped by the server. Workstation timezone differences do not govern reset windows or overwrite order.
- If no explicit landing preference exists, an Admin account linked to Cho opens Tracker · Cho Personal View. A separately chosen landing preference is preserved, but Admin View is always off after a fresh page load.

## Deployment

Deploy the **entire ZIP contents** to the existing Cloudflare Pages project. Keep `_headers`, `version.json`, `admin.html`, `schema.sql`, and the full `functions/` directory. Do not upload only `index.html`. No D1 schema migration is required. Preserve the existing Pages D1 binding (`PANTHEON_DB`), Discord OAuth configuration, and database.

After deployment, verify `https://dntrckr.pages.dev/version.json` reports `1.6.8-r41`. Existing tabs running a release with the watcher (r37 and newer) should detect the new manifest and reload after pending edits are confirmed. Very old tabs from before the release watcher was introduced need one initial hard refresh to load that watcher.

## Validation boundary

This package is locally validated for JavaScript/function syntax, CSS parsing, ZIP integrity/path preservation, and the server-side ownership guard. Production Cloudflare Pages, D1 data, and multiple simultaneous Discord sessions have not been tested from this workspace. Do not treat the release as live until the deployment verification steps above pass.
