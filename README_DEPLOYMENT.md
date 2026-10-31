# Pantheon Tools v1.6.8-r38

## Fix for slow or stuck “changes are still saving” update notice

- Core tracker synchronization is now separated from the optional revision-history journal. The tracker save is considered complete as soon as the shared tracker record confirms the write and all queued cell edits are acknowledged. Revision-history delivery continues in the background using its durable local queue.
- The release watcher triggers a save immediately when an update is available and local edits are pending. It rechecks save state every 1.5 seconds while an update is queued instead of waiting for the next 10-second release poll.
- The app now gives main shared-record reads and writes a 15-second timeout. A stalled request releases the sync lock, reports failure, and retains unconfirmed cell edits locally; it never silently clears the pending queue.
- If a cell edit is not acknowledged by the shared database, the update remains paused. No automatic reload occurs while a save is unconfirmed.

## Retained from r37

- Wide Bounty Share popup with one screenshot-to-clipboard action (PNG download is only a fallback if image clipboard access is blocked).
- Weekly Report moved into its own reset-time popup and remains available from the Tracker toolbar.
- Release manifest and no-cache Cloudflare Pages headers.
- Per-character 6-claim limits and all r37 display changes.

## Deployment

Deploy the complete ZIP contents. `version.json` and `_headers` are required for release polling/cache behavior. Existing tabs need one reload to load the release watcher if they are running a build older than r37. Once on a build with the watcher, later releases are detected automatically.

## Sync integrity

The D1 Pages Functions, cell-save endpoint, ownership validation, schema, and server-side authoritative cell ordering are unchanged from r37. The client change affects only how the core sync lock and secondary revision-history queue are sequenced. No data migration or D1 schema change is required.

## Validation boundary

Local tests cover syntax, CSS, package integrity, version watcher state transitions, core-sync acknowledgement before reload, revision-journal independence, and byte-for-byte preservation of D1 Functions/schema. No live Cloudflare deployment or multi-account production test is claimed.
