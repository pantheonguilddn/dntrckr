# Deploy Pantheon Tools v1.6.9-r02

1. Back up the currently deployed Pages files.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and Discord/OAuth environment settings unchanged.
4. Do not run SQL, reset D1, clear browser storage, or delete Tracker records. No D1 migration is required.
5. Verify that login, personal and Universal Tracker views, per-character checkbox saving, read-only access to other members, and the Extra Dungeons default-N/A behavior still work.
6. Compare D1 Rows Read after deployment. The expected reduction is in repeated full-record hydration on unchanged revisions; the current live usage percentage will not be retroactively reduced.

This release is a read-amplification correction based on local source inspection. A measured production improvement must be confirmed in Cloudflare D1 Metrics / Query Activity.
