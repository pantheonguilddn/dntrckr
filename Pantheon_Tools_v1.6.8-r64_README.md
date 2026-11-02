# Pantheon Tools v1.6.8-r64

## Changes

- Fixed the left Guild Members list refresh flow. Heartbeat updates and member-list retrieval now use separate request locks, so a heartbeat cannot block the list. A member-list request that overlaps another request is queued instead of silently dropped.
- Added a 15-second request timeout and an explicit retry action. The list no longer remains indefinitely on its initial loading message when the presence service does not respond.
- Renamed the initial placeholder to “Loading guild members…”. Errors now display an actionable retry control.
- Replaced the empty Guild Forum dragon icon with a bulletin-board pin (`📌`).
- Removed the “Runs & Clears” filter category. Raid/dungeon posts remain supported under All and are labeled “Dungeon report” when creating or viewing a post.
- Removed the leftmost Weeklies/Dailies group column from the Tracker table. Daily/weekly grouping remains in the underlying task model and continues to drive existing logic and completion calculations. The Category and Task columns now start at the left edge.

## Preserved

- No tracker checkbox save, retry, acknowledgement, owner authorization, or D1 character storage logic was changed.
- No dungeon registration or Extra Dungeons data was changed.
- No forum posts, replies, photos, member profiles, or existing D1 records were deleted.
- What's New popup remains disabled.
- No SQL schema migration or database reset is required.

## Validation

- Confirmed the presence refresh uses independent list and heartbeat busy flags, handles overlapping list requests, times out after 15 seconds, and presents a retry action.
- Confirmed there are no remaining `onlinePresenceBusy` references and all new presence state flags are declared.
- Confirmed the empty forum uses `📌` and the “Runs & Clears” category filter is removed.
- Confirmed Tracker initial and dynamic header/footer column spans are both two; dynamic column sizing no longer allocates a group column; task rows no longer append the group-label cell.
- JavaScript syntax, HTML IDs, CSS parsing, and ZIP integrity checked locally.

No live Cloudflare deployment or live D1 test was performed.
