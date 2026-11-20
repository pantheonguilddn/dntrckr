# Pantheon Tools v1.6.9-r24

## Changes
- Moved Guild Presence out of the permanent workspace column. It now opens as a flyout from a dedicated left navigation rail tab, freeing the main workspace.
- Corrected the Overview's fifth metric to **Remaining Tasks**, counting eligible non-bounty weekly tasks only. Bounty Board tasks are excluded.
- Outlier and best-performing character cards now identify class and completion performance. Tied results list all tied characters rather than hiding all but one.
- Compact View now suppresses explanatory recommendation paragraphs and keeps the direct next-task recommendation.
- Expanded the home/brand area so “Dragon Nest - Classic SEA [Guild Operations]” can display without clipping.
- Forced Tracker toolbar, section tabs, report controls, Roster Analytics, and analytics content to use the full workspace width rather than constrained centered widths.

## Preserved
- Based on r23. No backend Pages Functions, D1 schema, Discord authentication, ownership, synchronization, weekly reset, or stored Tracker history changes.
- Guild Presence still uses the existing live member list and heartbeat; only its presentation changed.
- Bounty Board remains separate from normal weekly task metrics.

## Deployment
Deploy to the existing Cloudflare Pages project `dntrckr` using the existing Wrangler or Git workflow. Do not create a new project, change D1 bindings, reset D1, or clear browser storage. Verify `/version.json` reports `1.6.9-r24`.
