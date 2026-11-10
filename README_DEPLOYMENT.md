# Deploy Pantheon Tools v1.6.9-r12

1. Back up the currently deployed Pages package before replacing it.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project, preserving the `functions/` paths.
3. Keep the existing D1 database binding, Discord OAuth settings, and environment variables unchanged.
4. Do not reset D1 or clear browser/site storage. No SQL migration is required for this release.
5. Verify `/version.json` reports `1.6.9-r12` after deployment.
6. Sign in with the administrator account, open Team Builder → Role Settings, and verify Silver Hunter appears under Archer.
7. Test adding one temporary class, job, and role, save, reload, and confirm the entries remain available in character registration and Team Builder. Remove the test entries only after verifying they are unused; no automatic delete control is included in this release.

This release adds an administrator-managed class / job / role catalog within the existing shared Job / Role settings. The r11 reset protections and existing player data handling remain in place.
