# Pantheon Tools v1.6.9-r15 — automatic Tracker inclusion and account-link archive

## Release base

Built from the r14 deployment package, which itself retains the r11-based Class / Job Catalog and the r13 Dungeon Registration task-index repair. This update retains the existing Cloudflare Pages Functions, D1 database, Discord OAuth configuration, and all prior tracker features.

## Automatic Tracker inclusion

- Every character registered in Member Roster is automatically included in Tracker. There is no per-character Tracker opt-in checkbox.
- Browser projections, Member Directory rendering, Admin character registration, server-side Member Roster normalization, and the D1 `character_owners` index use the same rule: a registered character is tracked.
- The one-time Admin Console → Player ownership audit → **Track all registered characters** action remains available to repair existing D1 owner-index rows and canonical roster projections. Run it once after deploying this release.
- Duplicate IGNs across different owners stop the bulk action before the canonical record is changed. Resolve duplicate registrations first.

## Archive former members’ Discord account links

- Player ownership audit now offers **Archive account link** for Member Roster entries with no confirmed Discord ID or a Discord account that is no longer enabled in the allowlist. The protected bootstrap administrator identity cannot be archived. An enabled Discord account must be cleared/replaced rather than hidden.
- Archiving is an audit-only status on the Member Roster owner record. It removes that former member from the active unlinked-account warning list and excludes their characters from the unlinked-warning count.
- It does not delete the Member Roster entry, unregister characters, disable a Discord account, alter character ownership rows, or remove any task cells, notes, weekly history, or completion-timing records. Their registered characters remain tracked.
- A collapsed **Archived account links** section shows archived entries and offers **Restore to audit**. Restoring makes the entry visible in the active audit again.
- Archive/restore timestamps and the acting administrator are recorded in the shared Member Roster record, with an audit event in D1. No new D1 table or schema migration is required.

## History preservation

- The bulk tracking action does not issue SQL against `character_task_cells` or `character_completion_timing`. It updates only Member Roster / roster projection data and D1 owner-index tracking flags.
- Account-link archive and restore actions update only the account-link audit metadata in the shared Member Roster record. They do not rewrite `character_owners`, task cells, or completion timing.
- No database reset, manual SQL, local-storage clearing, or member re-registration is required.
- Empty task-cell rows are not pre-created. Showing every registered character can increase Tracker rendering and some D1 reads, but cell writes remain limited to actual edits.

## Deployment requirement

This application depends on Cloudflare Pages Functions under `functions/`. Cloudflare's dashboard drag-and-drop deployment does not compile that directory. Deploy this release to the existing `dntrckr` Pages project using Wrangler from the extracted folder root; see `README_DEPLOYMENT.md`. Do not create a new Pages project or change the existing D1/OAuth bindings.

## Local validation

- ZIP root layout and integrity checked; `functions/` is at the package root.
- Inline JavaScript in `index.html` and `admin.html` checked with Node; all Pages Function modules checked as ES modules.
- HTML parser checks passed for both HTML documents.
- Regression tests cover automatic inclusion for legacy `trackerEnabled:false` profiles, archive/restore record semantics, audit counts, bootstrap protection, and preservation of task/timing tables.
- A mocked D1/API test was used; no live Cloudflare deployment or production D1 data was accessed. Verify the returned `version.json` build and run the one-time Admin recovery action after deployment.
