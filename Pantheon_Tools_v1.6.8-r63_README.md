# Pantheon Tools v1.6.8-r63

## Changes

- Removed decorative emojis from Guild Forum navigation, filters, profile actions, and other social action-button labels. The emoji insertion palette remains in the post composer so emoji use in posts and replies is unaffected.
- Simplified profile card labels for a cleaner presentation.
- Profile pictures now use the member's Discord OAuth avatar hash from the official Discord CDN. If no custom avatar is set, the card uses the correct Discord account-derived default avatar rather than a generated initial.
- The presence API now resolves the latest avatar from the member's most recent Discord OAuth session, so offline members can still show their stored Discord profile picture. Cached presence avatar remains a fallback when no session row is available.
- Added `idx_sessions_user_created` to support the latest-session avatar lookup efficiently. The index is created automatically by the presence endpoint if missing and is also declared in `schema.sql`.

## Preserved

- Guild Forum posts, replies, photos, and profile bios.
- Existing private-message records.
- Character checkbox sync queue, retry and acknowledgement behavior.
- Character ownership, Discord links, Dungeon Registration, and Extra Dungeons.
- What's New popup remains disabled.

## Validation

- Inline JavaScript syntax checks passed.
- CSS parsing passed.
- Duplicate HTML ID check passed.
- ZIP integrity verified.
- Avatar lookup query plan verified to use the composite `(discord_id, created_at DESC)` session index.
- Discord avatar URL generation checked for custom hashes, animated hashes, legacy same-user CDN URLs, and Discord default avatar IDs.

No live Cloudflare deployment or production D1 test was performed.
