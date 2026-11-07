# Pantheon Tools v1.6.9-r04

## Release purpose

Hotfix for the weekend-reset save failure reported on r03:
`D1_ERROR: too many terms in compound SELECT`.

## Changes

1. **Removed generated UNION ALL change-feed SQL.** Cell and timing change-feed rows are now inserted with SQLite JSON `json_each()` expansion. The statement remains one SELECT regardless of how many task edits are in the batch, avoiding D1's restricted compound-SELECT limit.
2. **Chunked large per-character reset queues.** The browser sends at most 40 changed cells per request and automatically continues with the next chunk after the prior chunk is acknowledged.
3. **Rejects oversized requests rather than silently truncating.** The server returns an explicit `CELL_BATCH_TOO_LARGE` response if a client sends more than 40 edits in one request.
4. **Preserves pending-write safety.** Every chunk is acknowledged independently; newer edits remain queued; failed chunks use the existing retry policy; non-retryable acknowledgement mismatches are no longer immediately re-flushed by the finalizer.
5. **No schema change.** Existing `tracker_storage_changes`, indexes, character-cell rows, timing rows, ownership rules, and revision feed remain in place.

## Recovery of the r03 reset

The r03 error happens inside the D1 batch. D1 batches are transactional, so the failing batch does not partially apply. The browser's pending-edit queue keeps the attempted reset changes on the device. After deploying r04, reload the same browser profile without clearing site data. On startup, the pending queue is re-enabled for retry (except an explicit `ACK_MISMATCH`, which remains parked for conflict review), then r04 saves the reset entries in acknowledged chunks. Check the save status until it confirms completion.

If the device that initiated the reset is unavailable, do not assume the local-only changes exist on another member's device. Recover from the same browser profile or reapply the reset only after confirming which characters are still pending.

## Validation

- `node --check` passed for all Cloudflare Functions.
- Inline JavaScript syntax checks passed for the main and admin pages.
- SQLite tests exercised 40 cell changes plus 40 timing changes through JSON `json_each()` feed insertion.
- Regression test confirmed no generated UNION ALL remains in the character-cell save endpoint.
- ZIP integrity and required deployment files checked.

## Deployment notes

Deploy the complete ZIP to the existing Cloudflare Pages project. Keep the existing D1 binding and OAuth/environment settings. Do not delete/recreate D1, run a destructive migration, or clear browser storage. This is locally validated; live two-account verification is still required.
