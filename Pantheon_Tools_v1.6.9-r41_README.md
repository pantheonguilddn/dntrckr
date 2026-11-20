# Pantheon Tools v1.6.9-r41

## Tracker Focus Guide

- Added a **Focus Guide: On/Off** control to the Tracker toolbar.
- Hovering a task cell highlights its complete dungeon row and the selected character's entire column, including the character header and weekly completion rate.
- The exact cell under the pointer receives a stronger accent treatment so the user can quickly find the row/column intersection.
- Keyboard navigation follows focus into checkboxes and bounty-note fields.
- On touchscreens, tapping a cell pins the highlight. Tapping the same cell again, tapping outside the table, or pressing Escape clears it.
- The enabled/disabled preference is saved locally per browser. It defaults to On for first-time users.
- The guide is presentation-only: it does not change checkbox state, bounty notes, right-click behavior, ownership rules, synchronization, or save events.
- The guide works in both Weekly Tracker and Bounty Board views and follows the active theme's accent/surface colors.

## Preservation

- Based on r40. All Cloudflare Pages Functions, D1 schema, authentication, forum APIs, forum post/reply photo handling and moderation, roster ownership, sync, weekly reset, completion history, and Team Builder behavior are unchanged.
- No D1 migration, database reset, or server-side setting is required. The only new preference is local to each browser.

## Validation

- Inline JavaScript syntax checked with Node.js.
- All Pages Function JavaScript files syntax checked.
- CSS blocks parsed and HTML structure/IDs checked.
- Verified character header and footer analytics cells carry the character key required by the column guide.
- ZIP integrity and root-level deployment layout checked.
- No live Cloudflare deployment or browser visual test was performed.
