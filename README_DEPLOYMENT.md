# Deployment instructions — v1.6.9-r05

1. Back up the current Pages deployment and D1 database if practical.
2. Deploy the complete contents of this ZIP to the existing Cloudflare Pages project.
3. Keep the existing `PANTHEON_DB` D1 binding, Discord OAuth variables, and other environment settings unchanged.
4. Do not delete/recreate D1, run a reset, or clear browser/site storage.
5. After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r05`.
6. Open the tracker and confirm the page remains loaded rather than repeatedly reloading. The authenticated session should be retained.
7. Then verify pending checkbox edits are acknowledged before asking other members to reload.

This is a static front-end release-marker hotfix on top of r04. No D1 migration is included. Local checks do not substitute for live production testing.
