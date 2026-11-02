# Deploy Pantheon Tools v1.6.9-r01

1. Back up the currently deployed site files.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and Discord/OAuth environment settings unchanged.
4. Do not run SQL, reset D1, clear browser storage, or delete existing Tracker records.
5. After deployment, verify that `Desert Dragon Memoria [Bounty]` can be registered under its dungeon category with the default-N/A checkbox enabled, and verify that an actual Bounty Board claim row is still rejected when default exclusion is attempted.
6. Also test rapid checkbox edits, character-specific opt-in, Share Bounties, and multi-member updates.

No D1 migration is required. This release preserves the r71/r72 data model and existing server storage.
