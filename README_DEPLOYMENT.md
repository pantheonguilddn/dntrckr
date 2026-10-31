# Pantheon Tools v1.6.8-r39 — per-character progress saves

## What changed

- Tracker checkbox and bounty-note edits now save through a dedicated authenticated `/api/cloud/b/:id/cells` endpoint in batches scoped to **one character**. A character's saved progress is confirmed independently; a failed character batch does not hold another character's save in the same browser.
- The server validates that the signed-in member owns the submitted character, stamps cells using server time, and commits with D1 compare-and-swap retries. It returns only the saved cell acknowledgements, not the private full Tracker record.
- Group-run completion timing is included in the same character transaction when extended analytics is enabled. The timing owner is derived from the authenticated Discord-to-roster link.
- Background Tracker refresh no longer stops simply because this browser has a pending cell edit. It fetches the newest guild record and overlays only the browser's unconfirmed local cells, allowing other characters' and members' updates to appear while a separate character save retries.
- Revision-status polling now has an 8-second timeout. A stalled status request releases the refresh lock and can retry, rather than leaving the browser permanently marked as refreshing.
- The global/settings sync path no longer batches or acknowledges per-character cell edits. It restores pending local cells from the current server record for the global transaction, while the dedicated cell route handles their save and acknowledgement.
- The confusing status text is clarified: the main Tracker save is complete; Revision History is queued separately. Revision History is not a prerequisite for another member seeing a saved checkbox.

## Permissions and data integrity

- The API server checks the existing `registrationWriteViolation` guard for each character batch. Member-owned cells can only be changed by that member (or an administrator); Universal View remains read-only.
- Each character batch is independently committed against the latest D1 record using compare-and-swap. Concurrent character batches retry against the most recent record; they do not submit stale roster snapshots.
- Pending edits are removed only when the exact character/task/state/note appears in the server acknowledgement. Unconfirmed edits stay local and retry per character.
- The main record D1 schema and existing whole-record API remain unchanged for administrator settings and legacy clients. One new Pages Function route is added; no D1 migration is required.
- r38 Bounty Share, Weekly Report, update watcher, and UI changes are retained.

## Validation boundary

Local tests cover the per-character API, D1 CAS behavior, member ownership rejection, independent character batches, acknowledgement retention, polling while cell edits remain pending, and preservation of the existing D1 functions/schema. Local checks are not a production Cloudflare/D1 multi-member test; deploy the complete package and verify with two member accounts.
