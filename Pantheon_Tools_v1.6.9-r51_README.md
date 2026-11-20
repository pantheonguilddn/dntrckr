# Pantheon Tools v1.6.9-r51

## Tracker Focus Guide: correct vertical emphasis

- The selected character's IGN header and matching Weekly Completion Rate cell receive the full theme-aware inversion.
- The task cells between those endpoints receive only a faint vertical wash. They retain their original text colors, checkbox appearance, and status fills for completed, marked, reset, excluded/N/A, and main-character cells.
- The vertical wash uses a translucent inset overlay so it does not replace the cell's original background or N/A striping. Main-character side rails and marked/reset status outlines are retained.
- The hovered cell continues to receive the stronger active-cell treatment.
- The selected dungeon/task-name cell and its spanning category cell continue to receive full inversion. Other character cells in that row keep the faint horizontal guide.
- Behavior is generic for every registered character and task in both Tracker tabs. It is not tied to example IGN or dungeon names.
- All temporary classes clear on pointer exit; keyboard focus and touch pinning behavior are retained.
- The treatment adapts to Dark, Light, Eye Comfort, and Pastel.

## Preserved

- Based on r50. This is a front-end-only Tracker Focus Guide correction plus release metadata and documentation.
- All Pages Functions, `admin.html`, `schema.sql`, authentication, D1 settings, Tracker task values, bounty notes, synchronization, reset behavior, and historical Tracker data are unchanged.
- No D1 migration, database reset, browser-storage clearing, OAuth/secret/binding change, or manual SQL is required.

## Validation performed

- Chromium interaction fixture tested both a main character and a regular character in all four themes.
- Confirmed the IGN header and matching completion-rate cell use the full inverse palette.
- Confirmed all task cells in the selected column receive only the faint path class; completed, excluded/N/A, and marked cell background, background image, and text colors remain unchanged beneath the translucent overlay.
- Confirmed the hovered intersection remains stronger, task-name/category labels invert, other character cells on the active row retain faint guidance, and pointer exit clears temporary classes.
- Inline JavaScript syntax, all Pages Function syntax, CSS parsing, HTML structure, duplicate IDs, version marker consistency, package layout, and ZIP integrity checked.
- All Pages Function files, `admin.html`, and `schema.sql` compared byte-for-byte with r50.

This source/package has not been deployed to Cloudflare Pages.
