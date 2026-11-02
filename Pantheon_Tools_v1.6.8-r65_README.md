# Pantheon Tools v1.6.8-r65

## Changes

- Replaced the stale chronological "Recent activity" list on member profile cards with a current weekly activity snapshot.
- The activity ratio is calculated across the member's active Tracker-enabled characters: completed eligible weekly checks divided by eligible weekly checks. Explicit N/A/excluded cells are removed from the denominator.
- Bounty tasks and Admin-selected Extra Dungeons are excluded using the same rules as the Tracker's completion rate.
- Added a "Next focus" suggestion. It checks the member's main character first and recommends up to two unfinished tasks with the highest shared Loot Weight. If the main character has no remaining eligible tasks, it selects the next tracked character with unfinished tasks. It does not recommend completed or N/A tasks.
- Activity is read from the current character-owned D1 task-cell rows rather than the optional completion-timing history, so it remains useful when historical analytics are disabled.
- No D1 schema change, background polling, tracker write path, or extra polling timer was added. The data is fetched with the existing profile-details request when a profile is opened.
- What's New popup remains disabled.

## Preserved

- Existing character ownership and registration.
- Tracker checkbox save queue, retry, acknowledgement, and per-character storage.
- Dungeon Registration, Activity Reference profiles, Extra Dungeons classifications, and Guild Forum posts/photos/replies.
- Existing member bios and Discord avatar handling.

## Validation

- Profile API JavaScript syntax checked.
- Verified the weekly task catalogue applies the same Weeklies, Bounty, and Extra Dungeon rules as the Tracker completion calculation.
- SQLite test confirmed the activity ratio excludes explicit N/A cells and Extra Dungeons, and the next-focus selection prefers the main character and higher shared task weights.
- SQLite query plan confirmed the profile lookup uses the member-owner index and character/task primary key.
- Main-page inline JavaScript syntax, HTML ID uniqueness, CSS parsing, version metadata, and ZIP integrity checked.

No live Cloudflare deployment or production D1 test was performed.
