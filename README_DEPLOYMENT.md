# Deployment notes · Pantheon Tools v1.6.8-r56

1. Upload the full ZIP contents to the existing Cloudflare Pages project.
2. Keep the existing `PANTHEON_DB` binding and environment variables. No D1 migration or schema change is needed.
3. After deployment, sign in as an administrator and open **Admin Console → Extra Dungeons**.
4. Tick optional weekly dungeon tasks and choose **Save Extra Dungeons**.
5. Open the Tracker or wait for its normal shared-data refresh. Selected dungeons stay visible and their saved checkboxes are untouched, but they no longer affect completion percentages or weekly report totals.

The release popup remains disabled. Do not delete, reset, or recreate the D1 database. Existing progress and owner links are preserved.
