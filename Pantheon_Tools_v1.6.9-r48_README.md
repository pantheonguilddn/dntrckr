# Pantheon Tools v1.6.9-r48

## Tracker Focus Guide: dungeon/category cells now reliably invert

- Fixed the actual cause of the disappearing dungeon/category labels: existing theme CSS had higher selector specificity and was repainting those cells after the Focus Guide styles.
- Increased selector specificity for the selected dungeon-name cell and the category cell whose `rowspan` covers the selected task. The full cell background, text, border, and text fill now use the same theme-aware inverse palette as the selected character column.
- Category span detection now checks actual table row indexes against each registered category cell's `rowspan`, so it works for every task and category rather than relying on particular dungeon or character names.
- The selected character column remains fully inverted, including its IGN/class header and matching task cells.
- Other character cells along the selected task row retain only a faint theme-accent overlay, preserving their normal completion/status colors.
- The exact selected character/task intersection retains its stronger active-cell treatment.
- Focus Guide classes are still cleared when hover/focus leaves the cell; the table returns to its normal appearance.
- Works generically for all registered character names, tasks, categories, and both Tracker tabs. No hardcoded examples.

## Preservation

- Based on r47. Front-end-only Tracker Focus Guide correction.
- No Tracker values, task state, bounty notes, save/sync behavior, reset logic, D1 schema, Pages Functions, authentication, or historical records were changed.
- No D1 migration, database reset, browser-storage clearing, or environment-variable changes are required.

## Validation performed

- Confirmed theme selector specificity exceeds the existing theme selectors for `.task-name` and `.col-category` cells.
- Confirmed the row-span lookup uses the selected task row's `rowIndex` and each category cell's start row plus `rowSpan`.
- Confirmed only the category/task label and selected character path receive full inversion; other row character cells receive only the soft overlay.
- Confirmed cleanup removes every Focus Guide class when leaving the selected cell.
- Checked app version, update-checker build, and `version.json` markers for exact r48 consistency.
- JavaScript syntax, HTML structure, CSS parsing, Pages Function syntax, backend/schema hash comparison, and ZIP integrity checks.
- No live Cloudflare deployment or interactive browser visual test was performed in this environment.
