# Pantheon Tools v1.6.9-r21

## UI and navigation update

- Moved Guild Forum and Salary Calculator into the left navigation rail.
- Kept Member Roster as the last primary navigation destination, directly above Help.
- Removed the Forum shortcut from the Guild Presence / Online Roster header to restore spacing.
- Split the Tracker into two exclusive tabs: Weekly Tracker first (default) and Bounty Board second.
- Weekly Tracker shows all configured non-bounty categories; Bounty Board shows only configured bounty-board slots.
- Removed the old Track Bounty Boards toggle. The Bounty Screenshot action appears only in Bounty Board. Weekly Report remains in Weekly Tracker.
- Expanded the top-right account chip and removed the Aegis appearance option. Legacy saved Aegis choice falls back to Guild.
- Compact mode now shortens explanatory copy and removes secondary stat descriptions, in addition to tightening spacing.

## Data / behavior safety

This is a front-end-only change. Cloudflare Pages Functions, admin.html, D1 schema, data APIs, authorization, sync, ownership, registered characters, cell/timing history, weekly reset logic, and bounty note data are retained. Daily resets explicitly exclude bounty-board rows regardless of which tab is open. No D1 migration or recovery action is required.

The selected tracker tab defaults to Weekly Tracker on a fresh load. The tab selection is a presentation state only and does not change saved progress.
