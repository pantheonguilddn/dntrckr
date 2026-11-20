# Pantheon Tools v1.6.9-r44

## Tracker Focus Guide: row highlight correction

- Fixed row-path highlighting to use the same per-cell class and CSS specificity as the character-column path. This prevents the standard theme cell-background rules from overriding the row selection.
- The selected dungeon row now inverts the full path across the task label and every character cell, including text, checkbox accents, bounty inputs, and placeholders.
- The category label cell is also highlighted when its `rowspan` covers the selected task row.
- The exact row/column intersection keeps its stronger active-cell fill and outline.
- Focus Guide remains always on for hover, keyboard focus, and touch pinning. No preference or toggle has been added.

## Preservation

- Based on r43. This is a front-end-only correction plus version metadata and release documentation.
- No D1 schema, Pages Functions, authentication, sync, task values, bounty notes, reset behavior, or historical Tracker records were changed.
- No database migration or browser-storage clearing is required.

## Validation

- Inline JavaScript syntax and HTML structure checks.
- CSS parsing and selector-presence/specificity checks for the row and column path.
- Confirmed row cells receive the same `tracker-guide-row-cell` class path as column cells use `tracker-guide-column`.
- All Pages Function JavaScript files syntax-checked and compared to r43.
- ZIP integrity and root-level deployment layout checked.
- No live deployment or browser visual test was performed in this environment.
