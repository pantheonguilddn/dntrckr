# Pantheon Tools v1.6.9-r49

## Tracker Focus Guide: continuous selected-column path

- The selected character IGN header retains the stronger inverse treatment.
- Every task cell beneath that IGN now receives a consistent, subtle theme-aware column tint and vertical edge rails through the final task row.
- Existing completed, pending, excluded/N/A, and bounty cell appearances remain legible; excluded cells retain their diagonal pattern with a tinted overlay.
- The Weekly Completion Rate footer is deliberately excluded from the selected-column path.
- The matching dungeon-name and spanning category cells continue to use the full inverse treatment from r48.
- Other character cells on the hovered dungeon row retain only the faint status-preserving highlight.
- The active intersection remains the strongest highlighted cell.
- Hover exit and focus cleanup continue to restore the original cell appearances.
- Behavior applies generically to all characters, tasks, categories, and both Tracker tabs.

## Preserved

- Based on r48; no data, Tracker save/sync logic, reset behavior, authentication, Pages Functions, D1 schema, or historical records were changed.
- No D1 migration, database reset, or browser-storage clearing is required.

## Validation

- Verified synchronized in-page, auto-refresh, and `version.json` build markers.
- JavaScript syntax checked for every inline script and Pages Function module.
- Parsed all CSS blocks and checked HTML structure/duplicate IDs.
- Confirmed the runtime marks every selected character task cell and IGN header, but no Weekly Completion Rate footer cell.
- Confirmed the selected-column wash is separate from full inversion applied to dungeon-name/category cells and from the faint active-row wash on other character cells.
- ZIP integrity and root-level Pages deployment layout checked.
- No live Cloudflare deployment or visual browser test was performed in this environment.
