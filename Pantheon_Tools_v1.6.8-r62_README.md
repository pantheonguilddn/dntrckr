# Pantheon Tools v1.6.8-r62

## Guild Forum and profile improvements

- Replaced the one-to-one message entry point with a shared **Guild Forum**. Members can publish achievement posts, successful dungeon/raid clears, party calls, announcements (administrators only), and general discussions.
- Each post can include one photo. The browser resizes it locally to a JPEG of approximately 250 KiB or less before submission. Photos are loaded from D1 only when their post image is requested; the forum feed does not download historical image blobs with its list query.
- Posts have threaded replies, reply-to-comment support, profile links on authors, and member/admin post removal controls. Forum posts are loaded when the Forum is opened or manually refreshed; there is no background feed polling.
- Added a curated Dragon Nest-flavoured emoji strip: Dragon/Nest, class/weapon, Dragon Jade, loot, heraldry/charm, alchemy, enhancement, elemental effects, wings, and achievement icons.
- Member profile cards now show the member's Pantheon nickname, registered Discord name, avatar, main character/class, other characters, an optional self-editable 240-character bio beside the identity, and the latest eight recorded task clears.
- Reworked profile grids and card typography so long nicknames, registered names, bios, character names, and activity labels wrap inside their card boundaries.
- Widened the desktop member rail to 344 px so the Guild Forum and collapse controls no longer crowd the member heading. Names can wrap instead of colliding with status labels. The rail remains visually blended into the page; its scrollbar appears during focus or scrolling. The collapsed rail remains compact.
- Added the missing `openGuildForum()` navigation handler used by the sidebar and profile buttons.

## Message error fix and compatibility

- The legacy private-message API now uses plain positional placeholders with exactly one bound value for every placeholder in the message insert and both inbox upserts. This removes the prior mixed numbered-placeholder/literal form that could produce a D1 binding-count error.
- The user-facing social experience now opens the Guild Forum rather than private DMs. Existing `guild_messages` history, replies, and inbox-summary rows are not deleted or reset.

## Data and D1 behavior

- `guild_member_profiles`, `guild_forum_posts`, and `guild_forum_comments` are created automatically on first authenticated use. Forum indexes are also created automatically, including an index for category-filtered recent posts.
- Existing member links, nicknames, character registrations, character progress, Extra Dungeons classifications, dungeon registration, private-message history, and presence rows are preserved.
- Photos are resized client-side and stored as base64 JPEG data in the existing D1 database. No R2 bucket or new environment binding is required. One photo is allowed per post, capped at roughly 250 KiB after compression.
- The forum list excludes image data and uses indexed filters; a photo is fetched separately on demand. The Guild Forum is not polled in the background, helping avoid unnecessary D1 reads.
- The tracker checkbox-save outbox, retry/acknowledgement path, per-character storage endpoints, and member ownership logic are unchanged.
- The What's New popup remains disabled.
- No manual SQL migration, database reset, or browser-data clearing is required.

## Validation performed

- All Cloudflare Function JavaScript files and all inline page scripts pass `node --check`.
- CSS parsing completed with no parser errors; static HTML IDs have no duplicates.
- `schema.sql` executes in local SQLite. Forum post/comment/photo retrieval/deletion statements, member bio upsert, recent-completion query, and legacy message/inbox inserts pass local SQLite checks.
- Forum list query plans use the expected recent-post/category indexes in local SQLite.
- Legacy message SQL placeholder counts match their supplied bindings exactly.
- ZIP integrity and package path checks pass.

No live Cloudflare deployment or production D1 end-to-end test was performed as part of this release.
