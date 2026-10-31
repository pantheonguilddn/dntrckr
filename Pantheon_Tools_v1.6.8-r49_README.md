# Pantheon Tools v1.6.8-r49

## What changed

- Keeps the owner-scoped character/task D1 storage introduced in r48.
- Automatically creates the additive storage tables and migrates the existing Tracker on the first authenticated administrator app startup.
- Removes the visible migration button and the separate manual SQL-console step. Normal deployment is one complete Cloudflare Pages ZIP upload.
- Preserves the existing `pantheon-main` record as a recovery backup before migration.
- Keeps player ownership enforcement, independent character saves, read-only Universal View, and explicit Admin View permissions.

## Deploy

Upload the complete ZIP contents to the existing Cloudflare Pages project. Preserve the existing D1 binding and Discord/OAuth environment settings. Sign in once with the administrator Discord account; the app prepares player storage automatically. No separate SQL file or manual migration action is required.

## Validation

Local JavaScript/Pages Function syntax, CSS parsing, ZIP integrity, migration/ownership/aggregation/concurrency tests, and unchanged auth function checks. Live production D1 testing remains necessary.
