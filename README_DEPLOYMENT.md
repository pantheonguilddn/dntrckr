# Pantheon Tools v1.6.8-r45 — release-loop hotfix

## Critical fix

- Fixes r44's auto-update loop. The r44 application still identified itself as r43 in its release watcher, so it repeatedly interpreted its own deployed r44 manifest as a newer build and reloaded. The r45 application, What's New label, document title, and `version.json` now all identify the build as `1.6.8-r45`.
- Hardens release detection to reload only when the manifest announces a *genuinely newer* recognized semantic build. Equal, older, or unrecognized version strings are ignored, preventing downgrade loops and reload storms when the manifest is stale or malformed.
- Keeps the r44 compact Admin switch and independent Personal/Universal viewing scope. Universal View remains read-only for other members unless Admin View is explicitly enabled.

## Preserved

- r44 UI, header layout, Admin toggle, Personal/Universal mode behavior, and view persistence.
- r43 one-Discord-identity / canonical personal owner behavior and duplicate-link repair.
- r42 startup initialization order fix.
- Existing Discord OAuth callback, session handling, authentication helper, API middleware, all other Pages Functions, D1 schema, and bindings. No changes are made to server functions or database schema in this hotfix.
- Pending cell-write queue, per-character acknowledged saves, retry behavior, server-side ownership checks, cache-bypassing refresh, and polling.

## Deployment

1. Deploy the complete ZIP contents to the existing Cloudflare Pages project. Do not upload only `index.html`.
2. Preserve the existing D1 database/binding, Discord OAuth configuration, and Pages environment variables.
3. Verify `https://dntrckr.pages.dev/version.json` reports `1.6.8-r45`.
4. Open the site and confirm that it remains stable for at least 60 seconds, navigating between Overview and Tracker. The release checker should not reload r45 when the manifest also reports r45.
5. Test Discord login, Cho Personal View, read-only Universal View, and Admin toggle separately. Confirm pending cell edits before switching or reloading.

## Validation boundary

Built locally from the complete r44 Cloudflare Pages archive. ZIP entry names and order are preserved. Local checks cover inline JavaScript syntax, CSS parsing, manifest/runtime version parity, release-comparison behavior, archive integrity, and unchanged Pages Functions/schema. No production deployment or live multi-account D1 test is claimed.
