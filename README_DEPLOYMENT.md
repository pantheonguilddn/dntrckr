# Pantheon Tools v1.6.8-r39

## Character-scoped tracker saves

- Routine checkbox, right-click state, and bounty-note edits now use a dedicated character patch endpoint (`POST /api/cloud/b/:id/cell`).
- The browser groups pending cell edits by character and sends each character's changes independently, with up to three character saves in flight. Each character is acknowledged separately. A failed character save does not prevent another character's save from completing. Pending queues are also isolated by Discord account on shared browsers, so one account's old pending edits cannot keep another account's page in a saving state.
- The server validates the authenticated member's ownership using the same registration guard as the full-record API. A member cannot patch another member's character through this endpoint.
- Each request reads the current D1 record and uses a compare-and-swap update, preserving all other characters and shared settings. Server-side timestamps remain authoritative; there is no D1 schema migration.
- A failed edit remains in the local retry queue. The live status names the character(s) whose edits remain pending rather than implying the entire roster is saving.
- Revision-history delivery remains outside the core save path.
- Remote refreshes may proceed while a failed cell remains queued, but the browser overlays its local pending cell edits and avoids applying a stale read if a new local edit happens during the request.

## Retained from r38

- Wide Bounty Share receipt layout with copy-as-image behavior.
- Weekly Report popup after weekly reset, with a toolbar button to reopen it.
- Automatic release polling, cache-control headers, and reload protection for pending edits.
- Per-character six-claim limits and all earlier ownership and reset protections.

## Deployment

Deploy the complete ZIP contents, including the new `functions/api/cloud/b/[id]/cell.js` route, `version.json`, and `_headers`. Existing r38 tabs already have the release watcher and should detect r39 automatically. If a tab does not update after the release manifest changes, one manual reload will bootstrap the new code.

## Validation boundary

Local checks cover JavaScript syntax, route syntax, CSS parsing, ZIP integrity, character grouping/acknowledgement behavior, and byte-for-byte preservation of the pre-existing D1 functions and database schema. No live Cloudflare deployment or real multi-account D1 test is claimed.
