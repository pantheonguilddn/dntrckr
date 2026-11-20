# Pantheon Tools v1.6.9-r42

## Tracker Focus Guide is now always active

- Removed the optional Focus Guide On/Off toolbar control and its local preference.
- Row and character-column guidance is now a built-in Tracker behavior in both Weekly Tracker and Bounty Board.
- Hovering a task cell highlights the full dungeon row and the selected character column, including the character header and weekly completion rate.
- The active cell receives a stronger highlight at the row/column intersection.
- Keyboard focus follows the focused cell.
- On touchscreens, tapping a cell pins the highlight; tapping the same cell again, tapping outside the table, or pressing Escape clears it.
- The guide is presentation-only and does not change checkbox state, bounty notes, right-click behavior, ownership, synchronization, or save events.
- Highlight colors continue to use the active theme.

## Preserved

- Based on r41. All forum editing, ownership moderation, photo attachments, authentication, D1 schema, backend APIs, Tracker data, completion history, Team Builder, and Guild Hub behavior are retained.
- No D1 migration, database reset, browser-storage clearing, or server-side setting is required.
- Existing users who had switched the r41 guide off now automatically receive the always-on guidance; the obsolete local preference is no longer read.

## Validation

- Inline JavaScript syntax checked with Node.js.
- All Pages Function JavaScript files syntax checked.
- CSS blocks parsed and HTML structure/IDs checked.
- Confirmed the optional toggle, local preference, and enabled/disabled code paths are removed.
- Confirmed the row, column, exact-cell, keyboard-focus, and touch-to-pin interaction paths remain.
- ZIP integrity and root-level deployment layout checked.
- No live Cloudflare deployment or browser visual test was performed.
