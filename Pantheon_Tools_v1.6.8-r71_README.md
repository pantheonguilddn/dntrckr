# Pantheon Tools v1.6.8-r71

## Unified Extra Dungeon exclusion control

- Admin Console **5. Extra Dungeons** is now the single shared catalogue for tasks that default to muted N/A per character.
- Every checked task remains visible in the Tracker but is excluded for each character until that character explicitly right-clicks its own cell to opt in.
- An opted-in character is included in that character's completion rates, weekly report, trends, insights, and Share Bounties. Other characters remain N/A and excluded.
- The optional Dungeon Registration checkbox is now a quick-add to this same Extra Dungeons catalogue; it no longer creates a separate policy. New tasks added with the checkbox checked appear selected in Console #5 immediately.
- Existing r68-r70 `defaultExcludedTasks` values are merged into the Console #5 list when it loads. Saving the list synchronizes the legacy field so older clients during rollout see the same policy.
- Existing Marked/Done cells are preserved. Untouched/open cells for selected tasks display as N/A. Weekly/daily reset behavior returns selected tasks to N/A for the next period.
- The catalogue is dynamic from registered task categories; no dungeon name is hard-coded. Register the task under its category, then manage it in Console #5 or use the registration quick-add checkbox.

## Data safety and deployment

- No SQL/D1 schema migration is required.
- Existing character cells, progress, bounty notes, member links, rosters, task history, and Activity Reference profiles are preserved.
- Deploy the full Cloudflare Pages ZIP contents to the existing project. Keep the existing D1 binding and OAuth/environment settings. Do not reset D1 or clear browser storage.

## Validation

- Inline JavaScript and all Cloudflare Pages Function syntax checked.
- Registration quick-add updates both the Console #5 catalogue and the compatibility field in one compare-and-swap write.
- Admin Console #5 GET merges legacy and current exclusion lists; PUT validates selected tasks against the live registered catalogue and synchronizes both fields.
- Per-character state logic checked: untouched/open remains excluded; Marked/Done is included only for that character; other characters remain excluded.
- Share Bounties reads opted-in tasks from the unified catalogue, including when no Bounty Board slot is available.
- ZIP integrity and version marker consistency verified.

No live Cloudflare/D1 deployment or production multi-account test was performed.
