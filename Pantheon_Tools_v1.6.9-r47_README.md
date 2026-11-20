# Pantheon Tools v1.6.9-r47

## Tracker Focus Guide: balanced row emphasis

- The selected character's column remains fully inverted, including the character IGN/class header and its task cells.
- The selected dungeon's task-name cell now receives the same full theme-aware background-and-text inversion.
- The category cell (EOL / PD / other registered group), including a cell whose `rowspan` covers the selected dungeon, receives the same full inversion.
- The exact selected character/dungeon intersection retains its stronger active-cell treatment.
- Other character cells along the same dungeon row are no longer fully inverted. They receive only a faint theme-accent overlay, while their existing done/marked/excluded/reset status colors and text remain intact.
- All temporary classes, including the soft row overlay, are removed when the pointer/focus leaves the selected cell, restoring the normal Tracker appearance.
- Hover, keyboard focus, and touch pinning remain always active. No toggle or preference was added.

## Preservation

- Based on r46. This is a front-end-only Tracker Focus Guide refinement.
- No Tracker values, task state, bounty notes, save/sync behavior, reset logic, D1 schema, Pages Functions, authentication, or historical records were changed.
- No D1 migration, database reset, browser-storage clearing, or environment-variable changes are required.

## Validation performed

- Confirmed only task-name/category cells and the selected character column receive the inverse styling classes.
- Confirmed other cells on the selected row receive the soft overlay class and preserve their existing background colors through a transparent background-image layer.
- Confirmed cleanup removes every Focus Guide class, including the soft row class.
- Checked release markers in `index.html`, the auto-refresh checker, and `version.json` for exact r47 consistency.
- JavaScript syntax, HTML structure, CSS parsing, Pages Function syntax, backend/schema hash comparison, and ZIP integrity checks.
- No live Cloudflare deployment or browser visual test was performed in this environment.
