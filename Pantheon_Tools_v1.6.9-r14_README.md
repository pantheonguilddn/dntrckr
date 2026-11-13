# Pantheon Tools v1.6.9-r14 — automatic Tracker inclusion and cloud-history restoration

## Base

Built directly on the r13 deployment package. This retains the r11-based Class / Job Catalog and the r13 Dungeon Registration task-index repair. It does not replace the D1 database, Pages Functions layout, Discord authentication, or Cloudflare environment configuration.

## What changed

- Every character registered in Member Roster is now automatically included in Tracker. The separate per-character Tracker opt-in has been removed from member registration, first-login confirmation, and Admin character registration.
- New registrations and subsequent member edits are projected into Tracker automatically. Server-side member-intent handling, the Admin character API, registration guards, and the D1 character-owner index all use the same rule.
- Existing legacy Tracker rosters that do not yet have a Member Roster owner are preserved during projection rather than silently discarded.
- The Member Directory displays one consistent green `TRACKING` state for every registered character. Admin registration and ownership views use the same automatic-inclusion rule.
- Admin Console → Player ownership audit now has a one-time **Track all registered characters** action. It updates the canonical Member Roster profile flags and Tracker roster projection, then enables the corresponding D1 character-owner rows. It also restores an inactive or missing owner row for a registered IGN where needed.
- Duplicate IGNs across different Member Roster owners stop the bulk action before the canonical record is changed. Resolve duplicate ownership first, then retry.

## Cloud history and data safety

- Existing `character_task_cells` and `character_completion_timing` rows are not read-modify-written, reset, or deleted by the bulk tracking action. The action never issues SQL against either progress table.
- For an existing D1 character-owner row, the action changes only `tracker_enabled`, `active`, and `updated_at`; it deliberately preserves the existing owner link columns.
- If a registered IGN has historical cell rows but no owner-index row, the action creates the missing owner row using the stable normalized IGN key. This allows the existing cloud history to become visible again.
- The action preserves member IDs, IGNs, class/job values, Main designation, Discord confirmation, and roster order. It does not clear browser storage or ask members to re-register.
- No D1 schema migration, new table, database reset, or manual SQL is required.
- Empty task-cell rows are not pre-created. However, showing every registered character can increase Tracker rendering and some D1 reads because more character task grids become visible. Cell writes still occur only when someone edits a task.

## One-time recovery after deployment

1. Back up the current deployment and confirm the Cloudflare D1 recovery point.
2. Upload the complete r14 ZIP to the existing Cloudflare Pages project.
3. Preserve the existing D1 binding, Discord OAuth settings, secrets, and environment variables. Do not reset D1 or clear browser storage.
4. Sign in as the administrator and enable Admin View.
5. Open Admin Console → Player ownership audit → **Track all registered characters**.
6. Review the confirmation, then run the action once. It is idempotent and can be safely retried if the response is interrupted.
7. Refresh the ownership audit and Tracker. Registered characters should display the green `TRACKING` status, and existing cloud progress for matching IGNs should reappear.

Future Member Roster registrations are automatically tracked; the bulk action is only needed to repair existing registrations already stored in the cloud.

## Validation

- Inline JavaScript in `index.html` and `admin.html` passed Node syntax checks.
- All Cloudflare Pages Function modules passed ES-module syntax checks; both HTML documents passed parser checks.
- Regression tests verified that registered characters with legacy `trackerEnabled:false` flags are indexed as tracked, that the bulk action includes all registered names, and that unmatched legacy rosters are preserved.
- A mocked D1/API test verified that the bulk action does not touch `character_task_cells` or `character_completion_timing`, preserves existing owner-link columns, restores missing owner-index rows, and rejects duplicate IGNs before changing the record.
- ZIP integrity and deployment file parity were checked.
- No live Cloudflare deployment or production D1 end-to-end test was performed. Verify the actual recovery action against the live environment after deployment.
