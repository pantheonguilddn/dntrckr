# Deploy Pantheon Tools r70

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r70.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and Discord/OAuth environment settings unchanged.
4. Do not run SQL, reset D1, clear browser data, or remove the existing tracker record.
5. Refresh/reopen Pantheon after deployment. The next Dungeon Registration attempt sends both the selected category ID and its visible name/group so stale category IDs can be resolved safely.

The existing r69 per-character default-N/A behavior is retained. Live deployment and production D1 verification are not included in this package build.
