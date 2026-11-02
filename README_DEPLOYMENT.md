# Deploy Pantheon Tools r64

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r64.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and environment variables unchanged.
4. Do not run SQL, reset D1, clear browser data, or remove existing tracker, member, forum, or message records.
5. After deployment, refresh Pantheon. The Guild Members list now requests its list independently from the heartbeat and shows a Retry control if the service does not answer within 15 seconds.

The Tracker no longer displays the separate Weeklies/Dailies group column. The category column is now leftmost; internal reset grouping and calculations are unchanged.

No manual SQL migration is required. The What's New popup remains disabled.

Note: no live Cloudflare deployment or end-to-end D1 validation is performed by this package build.
