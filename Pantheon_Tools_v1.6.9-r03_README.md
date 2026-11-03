# Pantheon Tools v1.6.9-r03

## Release purpose

This is a D1 read-amplification reduction release based on v1.6.9-r02. It addresses the two largest queries identified in the guild's Cloudflare D1 Query Insights:

- Full character-task hydration across the entire guild.
- Full recent completion-timing hydration across the entire guild.

## Changes

1. **Incremental character-progress synchronization.** Character-only changes are recorded in a compact indexed change feed. Other clients retrieve only cells and timing rows changed since their last acknowledged storage revision.
2. **Monotonic revision cursor.** The delta feed uses the D1 storage revision rather than browser timestamps. This avoids missing updates due to fast successive edits or workstation clock differences.
3. **Safe full-snapshot fallback.** First-time clients, missing/stale feed markers, explicit structural invalidations, cursor inconsistencies, or more than 10,000 changes request a full snapshot. This favors correctness over a potentially incomplete delta.
4. **Reduced startup reads.** After a browser has completed its first r03 snapshot and saved its local cursor/fingerprint, ordinary startup checks the current server revision and uses the incremental feed only when character data changed. Unchanged startup does not hydrate the whole Tracker.
5. **No-op global sync prevention.** Routine sync does not rewrite the main Tracker record when there are no actual shared/global changes.
6. **No post-write full hydration.** A global/settings write no longer re-reads all character cells and timing rows solely to build its acknowledgement response.
7. **Existing save safeguards retained.** Character ownership validation, per-character write batches, server acknowledgements, retryable local outbox, stale-feed fallback, Extra Dungeons/default-N/A policy, and Bounty Board claim-row protection are retained.

## Additive database setup

The release adds `tracker_storage_changes` and an index on `(change_type, revision)`. The existing authenticated administrator startup endpoint provisions these objects idempotently. This is additive only; existing D1 data is not cleared, rewritten, or recreated. No manual SQL command is required for the normal Pages deployment flow.

The first administrator to open the r03 app should complete the existing Player Storage readiness check before members begin using the new build. Each browser/device performs one full initial snapshot to establish its r03 local cursor; subsequent unchanged startups do not repeat that full hydration.

## Deployment and verification

- Keep the existing Cloudflare Pages project, `PANTHEON_DB` binding, OAuth/Discord settings, and environment variables.
- Do not delete/recreate D1, reset browser storage, or clear pending local saves.
- Deploy the complete ZIP, sign in as the administrator first, and confirm Player Storage is ready. Then let a small group test before inviting the full guild to refresh.
- Confirm a character checkbox save is acknowledged; confirm a second account receives that change; confirm Universal View remains read-only; test a settings/roster change and a browser restart.
- Compare the two Query Insights statements and Rows Read usage after a normal usage period.

## Validation performed

- All Cloudflare Function JavaScript files passed `node --check`.
- All inline JavaScript blocks in `index.html` and `admin.html` passed `node --check`.
- Incremental API tests passed for normal deltas, authentication, main-record restriction, stale-feed fallback, full invalidation, and future cursors.
- SQLite schema/write/delta tests passed for both cell and timing changes, including a 40-cell plus 40-timing update batch (85 D1 statements maximum).
- SQLite query-plan inspection confirmed the delta query uses `idx_tracker_storage_changes_type_revision` and primary-key lookups for the joined records.
- ZIP integrity and file presence should be checked at packaging time.

## Important limitation

This release has been validated locally, not against the live Cloudflare D1 database or a real multi-account browser session. It is a deployment candidate, not a claim of measured production stability. The first r03 launch on each browser intentionally performs one full snapshot. Production read reduction must be confirmed using Cloudflare Query Insights and Rows Read after deployment.
