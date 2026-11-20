# Pantheon Tools v1.6.9-r25

## Audit corrections
- Corrected Overview Outlier and Most Completed class labels to read the Member Roster `job` field, with legacy class-field fallbacks.
- Corrected Remaining Tasks to use the existing completion-task filter, excluding Bounty Board tasks and excluded entries.
- Corrected Compact View so concise next-task actions remain visible. Long rationale text is replaced by direct action text; trend and secondary metadata stay collapsed.

## Retained from r24
- Guild Presence opens as a flyout from the left navigation rail.
- Overview Remaining Tasks counts eligible non-bounty weekly tasks and skips excluded cells.
- Outlier and best-performing cards list tied characters.
- Tracker and Analytics continue to occupy the full workspace width.
- Brand title wrapping remains enabled.

## Preservation
- Based on r24. All 31 Pages Function files, D1 schema, authentication, ownership, synchronization, reset behavior, and stored Tracker history are unchanged from r24.
- No D1 migration, database reset, browser-storage clearing, or binding changes are required.

## Deployment
Deploy to the existing Cloudflare Pages project `dntrckr` using the included deployment instructions. Verify `/version.json` reports `1.6.9-r25`.
