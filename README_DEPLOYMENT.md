# Deploy Pantheon Tools r62

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r62.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and environment variables unchanged.
4. Do not run SQL manually, reset D1, clear browser data, or delete existing records.
5. On first authenticated use, the Community Profile and Forum APIs create their new tables and indexes automatically. There is no manual schema step.
6. Members open the **Guild Forum** from the left rail to load the current feed. The forum does not poll while closed. Use Refresh to retrieve new posts.
7. Forum photos are resized in the browser and stored in D1. One photo per post is supported, with the compressed image capped at about 250 KiB. No R2 binding is required.
8. The visible private-message entry point is replaced by the shared Guild Forum. Existing private-message rows remain in D1 and are not deleted. The legacy message API also has an updated explicit binding path for clients that still call it.

The tracker checkbox outbox, automatic retry/acknowledgement behavior, character ownership, Discord links, Dungeon Registration, and Extra Dungeons are preserved. The What's New popup remains disabled.

No live deployment or production D1 verification is included in this package. After deployment, confirm login, member profile, bio save, a new Guild Forum post with a photo, a reply, and one existing tracker checkbox save. Do not clear browser storage or reset the database during verification.
