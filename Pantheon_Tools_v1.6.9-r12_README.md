# Pantheon Tools v1.6.9-r12

## Base release

This package is built directly from the `Pantheon_Tools_v1.6.9-r11_DEPLOYMENT.zip` archive (the r11 release with the Member Roster reset safeguards). It is **not** based on the earlier r12 package. The r11 Pages Functions, admin console, reset safeguards, registration guard, and existing app behavior are retained except for the two small server-side changes listed below.

## Change: additive Admin Class / Job Catalog

- Adds an Admin View-only `＋ Classes / Jobs` action to Team Builder.
- Administrators can add a new base class, then add one or more jobs under that class.
- Jobs can be marked as a **Basic Job** or left as a later specialization.
- New classes and jobs are available in Member Roster, character registration, Class Setup, and Team Builder filters.
- New jobs start with raid position `Unassigned` and no damage type or secondary roles. This avoids inventing role metadata for a newly released class. Administrators can configure the role later in the existing Role Settings screen.
- The catalog is stored as an additive shared setting and merges class/job additions from both sides. There is no catalog deletion control.
- The server accepts additions only from an authenticated administrator request in Admin View and merges them append-only. Member syncs, stale tabs, and version-history restores cannot erase existing catalog entries.
- Class/job catalog changes are included in global revision snapshots. Catalog additions cannot be removed by version-history undo, so historical restores cannot invalidate live character assignments.

### Examples

- To add Silver Hunter: add a job named `Silver Hunter` under the existing `Archer` class. Leave `Basic Job` unchecked.
- To add a future base class: add the base class first, then add its initial job and mark it as `Basic Job`. Later specializations can be added under the same base class.

## Registration and data safety

- This is an additive catalog option. Adding a class or job does not create, update, rename, reorder, remove, or reassign any Member Roster character.
- Existing built-in class/job definitions remain unchanged.
- The only new setting is `settings.classJobCatalog`; no existing character registration fields are migrated.
- No D1 schema migration is required.
- The two Pages Function changes only compact the new setting and enforce admin ownership of that setting. Existing registration guard and member-intent behavior are retained.
- No Tracker task cells, completion records, reset markers, roster rows, or character-storage rows are intentionally changed by this feature.

## Validation performed

- All inline JavaScript blocks passed Node syntax checks.
- All Pages Function JavaScript modules passed syntax checks.
- A regression harness confirmed that existing built-in job assignments, a newly added basic job assignment, Tracker opt-in, Main designation, and character count survive job/catalog normalization.
- The backend compact encoder/decoder round-tripped the new catalog and an existing Tracker cell.
- ZIP integrity was checked.

Live Cloudflare deployment and live D1 testing were not performed from this environment.

## Deployment precautions

1. Back up the currently deployed r11 package and confirm the current Cloudflare Time Travel recovery point.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project.
3. Preserve the existing D1 database binding, Discord OAuth settings, and environment variables.
4. Do not reset D1 or clear browser storage.
5. Confirm `/version.json` reports `1.6.9-r12` after deployment.
6. In Admin View, open Team Builder and use `＋ Classes / Jobs` to add catalog entries.
7. Verify the class/job choices in Member Roster and Team Builder before changing any existing character assignment.

The existing r11 recovery guidance remains applicable: if an older release already committed unwanted changes to D1, this code cannot reconstruct those earlier values. Use Cloudflare Time Travel only after confirming the desired restore time, because Time Travel rolls back the entire database.
