# Pantheon Tools v1.6.9-r28

## Changes

- Removed the duplicate **Character Activity Summary** and Tracker deadline-strategy block from Roster Analytics. The Overview carousel remains the home for weekly pace, character checks, task recommendations, and deadline guidance.
- Kept Tracker Roster Analytics focused on saved historical roster performance. The five-week character completion trend cards remain where the existing analytics preference permits them, as do the separate weekly report and historical archive features.
- Reworked Team Builder into 4-Man Party and 8-Man Party tabs. Each tab has exactly one party lineup, its own locally saved difficulty, and its own local browser save. Only the selected party is displayed at a time.
- Replaced the compressed two-team tables with full-width, responsive slot cards. Each assigned character shows Class, Job, the job's role description, primary Raid Position, configured additional roles, damage type, and owner.
- Removed Team 2 controls and the split-party mechanic from the Team Builder UI. The legacy Team 2 local-state field is retained for backwards compatibility, but it is not displayed or imported into either new party layout.
- On first migration, the former Team 1 lineup seeds both size tabs: its first four assignments populate 4-Man, and all eight assignments populate 8-Man. This preserves the full old Team 1 lineup when switching party size. The two tabs can then be edited independently, including their Normal / Hardcore difficulty selection.
- Kept role setup, class setup, owner-duplication preference, roster filtering, local save, and screenshot sharing. Screenshot sharing exports only the currently selected party.

## Data and deployment safety

- No D1 schema or database migration.
- No Pages Function or authentication changes.
- No tracker cells, weekly archives, member roster profiles, or cloud history are modified by these UI changes.
- Team Builder layouts remain local to each browser. 4-Man and 8-Man layouts are saved separately. The existing Team 2 local value remains in the legacy object but has no visible controls and is not used by the new Team Builder.
- The previous Team 1 assignments are copied into both new size layouts during first normalization, as described above. No browser storage is cleared.

## Validation

- 9 inline JavaScript blocks across `index.html` and `admin.html` passed `node --check`.
- All 31 Cloudflare Pages Function JavaScript files passed `node --check`.
- All 49 CSS blocks parsed with zero top-level CSS syntax errors.
- Structural checks confirmed one visible party card, separate 4-Man / 8-Man tabs, no Team 2 controls, and no duplicate Character Activity Summary or Tracker deadline banner in `renderAnalytics()`.
- A focused migration test confirmed the former Team 1 slots seed the first four 4-Man positions and all eight 8-Man positions; changing one party does not change the other, and the legacy Team 2 object remains preserved.
- `schema.sql`, `admin.html`, and all 31 Pages Function files are byte-for-byte unchanged from r27.
- The deployment ZIP passed `unzip -t`.
- A local browser visual test could not be completed because Chromium navigation was blocked by the environment. No live production test was performed.
