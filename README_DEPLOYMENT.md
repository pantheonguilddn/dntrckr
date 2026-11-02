# Deploy Pantheon Tools r63

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r63.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and environment variables unchanged.
4. Do not run SQL manually, reset D1, clear browser data, or delete existing records.
5. The presence API reads each member's latest Discord OAuth avatar hash from the existing sessions table, with a cached presence avatar fallback. The `idx_sessions_user_created` index is created automatically if it is missing.
6. Profile pictures are rendered directly from Discord's CDN. Members with no custom Discord avatar use Discord's account-derived default avatar. The avatar is refreshed when the member next authenticates with Discord.
7. Social action buttons now use plain text labels. The emoji picker remains available inside the post composer for members who want emojis in their posts.
8. Existing private-message history, guild posts, replies, profile bios, and photos are retained.

The tracker checkbox outbox, retry/acknowledgement behavior, character ownership, Discord links, Dungeon Registration, Extra Dungeons, forum APIs, and D1 data are preserved. The What's New popup remains disabled.

No live deployment or production D1 verification is included. After deployment, check that member profile pictures match their Discord avatars, action buttons use plain labels, and a profile/forum still opens normally. Do not clear browser storage or reset D1 during verification.
