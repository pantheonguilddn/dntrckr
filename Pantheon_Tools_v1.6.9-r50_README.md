# Pantheon Tools v1.6.9-r50

## Tracker Focus Guide: consistent main-character and completion-rate inversion

- Every selected character task cell now receives the same full theme-aware background and text inversion as its IGN header, including cells belonging to main characters. The selected column no longer relies on a translucent overlay that could be overridden by main-character or task-status styling.
- Main-character gold/status styles remain unchanged outside hover/focus/pin; during selection, the focus guide takes visual priority so the complete column is readable.
- The selected character's Weekly Completion Rate footer cell now receives the same inversion and border treatment as its IGN header.
- Dungeon/task-name and spanning category cells retain their full inverse treatment. Other characters' cells in the selected row keep the subtle highlight. The exact hovered cell retains the stronger intersection treatment.
- Hover exit, keyboard focus changes, touch pin/unpin, and Escape cleanup continue to remove temporary focus classes.
- All behavior is generic for every character, task, category, and both Tracker tabs.

## Preservation

- Based on r49. No Tracker data, status logic, save/sync behavior, bounty notes, ownership, authentication, D1 schema, Pages Functions, or historical records were changed.
- No D1 migration, browser-storage clearing, or Cloudflare binding/secret changes are required.

## Validation performed

- Updated `PANTHEON_TOOLS_VERSION`, auto-refresh `CURRENT_BUILD`, and `version.json` consistently to `1.6.9-r50`.
- Confirmed the runtime adds/removes the selected-column class on all character task cells, matching IGN header, and matching Weekly Completion Rate footer cell using `data-char`.
- Verified high-specificity focus CSS overrides legacy main-character and task-status styles while preserving the existing faint row highlight for other characters.
- JavaScript syntax, HTML structure/duplicate IDs, CSS parsing, Pages Function syntax, backend/schema byte comparison, and ZIP integrity checks.
- No live Cloudflare deployment or production browser session test was performed.
