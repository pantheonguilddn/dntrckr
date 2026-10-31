# Pantheon Tools v1.6.8-r40 — authoritative shared-cell refresh

## What changed

- Shared character/task cells now use the latest server record as the authoritative baseline during background refresh, initial/manual sync, and whole-record retry merges.
- The previous merge could choose a stale browser-cached cell over a newer shared value when the local cell timestamp was ahead (for example, because of client clock skew). This could hide both the dungeon bounty mark and its linked Bounty 1–6 target note even though the other member had received a successful save acknowledgement.
- This release fixes that by replacing the merged cell map with the server's cell map before applying the current browser's explicitly pending, unconfirmed edits.
- Pending local edits remain visible and protected until the dedicated per-character endpoint confirms them. All non-pending character cells now reflect D1.

## Retained from r39

- Independent per-character cell batches and server acknowledgements.
- Per-character retries and CAS-protected D1 writes.
- Member ownership enforcement and Universal View read-only protection.
- Polling while a local character save is pending, with revision requests bounded by timeout.
- Bounty Share, Weekly Report, and separate Revision History queue.

## Validation boundary

This is a locally built package. It has not been deployed to Cloudflare or verified against the live production D1 database. Local regression tests cover the specific stale-cache scenario for both the dungeon mark and linked Bounty slot, pending-edit overlay, existing r39 per-character API behavior, JavaScript syntax, package integrity, and unchanged schema/pre-existing Pages Functions.
