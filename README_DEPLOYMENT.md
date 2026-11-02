# Deploy Pantheon Tools r60

1. Upload the complete contents of `Pantheon_Cloudflare_Pages_v1.6.8-r60.zip` to the existing Cloudflare Pages project. Preserve the `functions/` directory structure.
2. Keep the existing `PANTHEON_DB` D1 binding and Cloudflare environment variables unchanged.
3. Do not reset D1, clear browser data, remove existing tracker records, or run a manual SQL migration.
4. The new `/api/messages` endpoint creates its `guild_messages` table and indexes automatically the first time an authenticated member opens Messages. `schema.sql` also includes the DDL for reference.
5. Members should open Pantheon normally. The Guild Activity list uses the existing approved-account directory. Clicking a member opens their profile card; the Messages button opens a private conversation.
6. Messaging requires both participants to have a unique confirmed Discord ID link to a Member Roster entry and an enabled `allowed_users` account. Resolve incomplete or duplicate links through Admin Console → Player Ownership Audit.

Direct messages are stored in D1 and are visible in the app only to the two authenticated participants. Message text is limited to 2,000 characters; rate limit is 20 sends per sender per minute. This release does not add attachments or external push notifications. The inbox unread badge refreshes while Pantheon is open.

Existing checkbox syncing, local pending-save recovery, character data, Extra Dungeon settings, and dungeon registration/details are preserved. The What's New popup remains disabled.

This release has not been deployed or verified against the live Cloudflare D1 database.
