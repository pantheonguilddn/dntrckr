# Deploy Pantheon Tools r57

1. Upload the complete contents of `Pantheon_Cloudflare_Pages_v1.6.8-r57.zip` to the existing Cloudflare Pages project. Preserve the `functions/` folder structure.
2. Keep the existing `PANTHEON_DB` binding and environment variables unchanged.
3. Do not run SQL, reset D1, clear browser data, or delete the existing tracker record.
4. After deployment, reload Pantheon and open Admin Console → Extra Dungeons. Registered tasks from both Weeklies and Dailies categories are listed and grouped by reset schedule. The list refreshes when the admin page is focused and every 10 seconds while visible.
5. A dungeon registration now waits for the shared settings save; check the sync status if registration is reported as not yet confirmed. If the Admin Console is already open in another tab, its Extra Dungeons list refreshes automatically while visible or when the tab regains focus.

The What's New popup remains disabled. The r57 UI updates do not change the per-character progress endpoints or storage schema.
