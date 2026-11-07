# Deploy Pantheon Tools v1.6.9-r04

1. Deploy the complete ZIP to the existing Cloudflare Pages project, preserving the `functions/` paths.
2. Keep the current `PANTHEON_DB` D1 binding, Discord OAuth configuration, and environment variables.
3. Do not delete/recreate D1, reset its tables, or clear browser/site storage. No database migration is required for r04.
4. Ask the member/browser that first encountered the reset error to reload Pantheon from the same browser profile. This lets its saved pending queue resume and submit the reset edits in chunks.
5. Wait for the character save indicator to confirm completion before closing that browser. Do not repeat the weekly reset manually while the queue is still pending.
6. Test one character with several task changes, then one full reset queue. Confirm Universal View receives the changes from another account.
7. In D1 Query Insights, confirm the character-cell save request no longer produces `too many terms in compound SELECT`.

This package has local syntax and SQLite regression validation only. It has not been deployed to or tested against the live Cloudflare D1 database.
