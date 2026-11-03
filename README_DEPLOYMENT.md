# Deploy Pantheon Tools v1.6.9-r03

1. Back up the currently deployed Pages files and export the existing D1 database before rollout.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding, Discord/OAuth settings, and all environment variables unchanged.
4. Do not delete/recreate the D1 database, clear browser storage, or delete Tracker records. The new change-feed table and index are provisioned idempotently by the existing authenticated administrator Player Storage startup endpoint. No manual SQL is required for the normal deployment flow.
5. After deployment, sign in as the administrator first. Let the Player Storage readiness check complete. This creates the additive change-feed table/index and its initial safety markers. Then test with one or two members before asking the entire guild to refresh.
6. The first r03 launch on each browser/device performs one full snapshot to establish that browser's local revision cursor and cache fingerprint. Subsequent unchanged startups use a lightweight revision check; character-only changes use the indexed incremental feed.
7. Verify: login; personal Tracker; read-only Universal View; checkbox save acknowledgement; a second account receiving the change; browser restart; a shared settings/roster change; Extra Dungeons default-N/A behavior; Bounty Board claim-row protection; Team Builder and other core tools.
8. In Cloudflare D1 Query Insights, compare the full `character_task_cells` hydration query and the full `character_completion_timing` hydration query. Both should become uncommon and correspond primarily to first snapshots or intentional full invalidations. Check Rows Read over a normal guild-usage period.

This release is locally validated only. It has not been deployed to the live Pages project, exercised against the live D1 database, or tested in a real multi-account browser session. Do not treat the expected reduction as a measured production result until Cloudflare metrics confirm it.
