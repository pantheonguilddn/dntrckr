# Pantheon Tools v1.6.8-r69

## Per-character opt-in overrides Extra Dungeons

- Keeps the r68 **Exclude from calculations by default** setting in Dungeon Registration.
- Fixes the interaction with Admin Console > Extra Dungeons: a task tagged as an Extra Dungeon is normally excluded guild-wide, but if it is also configured as N/A-by-default, an explicit character-level Marked or Done state is included for that character.
- Characters who leave the cell at N/A remain excluded from their own completion rate, weekly report, trends, and activity insights. Other characters are unaffected.
- Right-clicking a default-N/A cell opts in only that character; any available Bounty Board slot is linked automatically, while the task still appears in Share Bounties if no empty slot exists.
- Weekly reset returns opted-in default-N/A tasks to N/A for the new week, so the opt-in does not silently carry forward.
- Updates the Admin Console explanation so the override is clear.

## Data safety

- No D1 schema migration is required. The behavior uses the existing shared `defaultExcludedTasks`, `extraDungeonTasks`, and per-character cell-state fields.
- No character progress, member links, task history, roster data, forum posts, or profile banners are deleted.
- Existing Extra Dungeon behavior is unchanged for tasks that are not configured as N/A-by-default.

## Validation

- Inline JavaScript and Cloudflare Functions syntax checked.
- ZIP integrity and package file list verified.
- Deterministic calculation tests cover: ordinary Extra Dungeon remains excluded; default-N/A Extra Dungeon is excluded for N/A characters; the same task is counted for a character with a Marked or Done state; unrelated characters remain excluded.
- Completion-rate, archived-rate, weekly trend, per-task insight, and weekly-report paths use the same eligibility rule.
- No live Cloudflare deployment or production D1 end-to-end test was performed.
