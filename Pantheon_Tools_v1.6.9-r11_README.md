# Pantheon Tools v1.6.9-r11

## Critical fix: roster saves cannot trigger a progress reset

The previous builds called `checkAutoResets()` inside the shared-record sync that follows a Member Roster save. If the restored/current record carried a stale reset marker, Admin View could start a guild-wide reset as a side effect of adding a member. The reset engine then queued task-cell writes in batches of 40, matching the reported `40 pending` symptom.

r11 changes:

- A sync carrying Member Directory intents defers automatic daily/weekly reset execution. Adding, editing, or removing a member cannot itself start a reset.
- Daily reset only changes cells with `updatedAt` older than the scheduled daily UTC boundary.
- Weekly reset only changes cells with `updatedAt` older than the scheduled weekly UTC boundary. Current-cycle completions and notes survive a delayed or stale reset marker.
- Weekly archive snapshots are not overwritten with post-boundary/current-cycle cell data.
- Reset writes are stamped at the scheduled reset boundary, making repeated reset checks idempotent.
- Existing r10 Worker-side protections for member-scoped operations and legacy migration requests are retained.
- On startup, a same-character, same-second burst of eight or more open/excluded reset-task writes from an older build is quarantined in the local outbox. Those writes are retained in a separate localStorage archive, removed from the active outbox, and cannot block Admin View or be included in retries/manual Sync.
- If such a batch is found, r11 reads the authoritative D1 Tracker snapshot once and restores the visible cell values from D1 without overlaying the quarantined edits.

## Data and deployment safety

- No D1 schema migration is required.
- No task-progress rows are deleted by this code.
- Keep the existing D1 database, bindings, Discord OAuth secrets, and environment variables.
- Do not clear browser storage. Do not retry Add Member while a previous roster save is unconfirmed.
- If an earlier r10 automatic reset was already committed, r11 prevents repeat damage but cannot restore the pre-reset values. Use the existing Cloudflare Time Travel recovery point only after confirming the desired restore timestamp; Time Travel rolls back the entire database.

## Validation performed

- Extracted reset functions were executed in a Node regression harness with pre-boundary and post-boundary daily/weekly cell records.
- Confirmed current-cycle cells and bounty notes survive a delayed reset; older completed cells reset; repeated reset execution does not reset the same cells again; weekly archive entries for current-cycle work are not overwritten.
- Verified Member Directory save sync bypasses both pre- and post-sync automatic reset calls.
- Verified a 12-cell legacy reset burst is held locally, persisted, and remains quarantined on repeated checks. Archived edits are excluded from outgoing writes and local overlays, and no longer count as active pending saves.
- All Pages Function modules and inline JavaScript blocks passed syntax checks.
- ZIP integrity and release markers checked.

Live Cloudflare deployment and D1 integration have not been tested from this environment.
