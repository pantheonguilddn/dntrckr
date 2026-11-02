# Pantheon Tools v1.6.8-r60

## Guild profile cards and private messages

- The left Guild Activity rail now blends into the workspace background instead of reading as a separate floating panel. Its scrollbar is transparent by default and appears while the list is being scrolled or keyboard-focused.
- Every online/offline member name is clickable and opens a profile popup.
- Profile cards show the Discord avatar, editable Pantheon nickname, the registered Discord/allowlist name in smaller text, the selected main character and class, and the member's other registered characters/classes.
- The Guild Activity header includes a Messages inbox button with an unread count.
- Members can open one-to-one private conversations from a profile or from the inbox. Messages support emoji shortcuts, replies to individual messages, and automatic unread/read status.
- Direct messages are tied to the two participants' stable Discord IDs and stable Pantheon member IDs, never to editable nicknames. The API requires each participant to have a unique confirmed Discord-to-roster link and an enabled Pantheon account.
- Conversation history is stored in D1. A participant can read only conversations involving their own authenticated Discord ID. Administrators do not receive a guild-wide message-reading endpoint.
- Messages are limited to 2,000 characters and 20 sends per sender per minute. This is a lightweight text feature; file/image attachments are not included.

## Data and compatibility

- The new `guild_messages` table is created automatically by the authenticated messages API on first use. Its DDL is also included in `schema.sql` for reference and new installations. No manual SQL step is required for an existing deployment.
- Existing profile/member directory records, characters, main-character selections, tracker checks, pending save queues, and Extra Dungeon settings are preserved.
- The existing tracker checkbox-save queue, retry, and acknowledgement implementation is unchanged.
- The What's New release popup remains disabled.
- Existing `PANTHEON_DB` binding and Cloudflare environment variables remain unchanged.

## Validation performed

- All inline JavaScript blocks and Cloudflare Functions pass Node syntax checks.
- CSS parsing passes and the HTML contains no duplicate IDs.
- Endpoint-handler integration tests with a mocked D1 binding cover message send, private conversation retrieval, unread count, read acknowledgement, replies, unknown recipient rejection, and unlinked-sender rejection.
- Presence/profile mapping tests cover nickname, registered name, avatar, main character/class, other characters, and online/offline state.
- SQLite executed the updated schema and the presence account query successfully.
- ZIP integrity and package file preservation checks pass.

No live Cloudflare deployment or production D1 test has been performed.
