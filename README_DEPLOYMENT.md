# Deploy Pantheon Tools v1.6.9-r12 (r11 base + additive Class / Job Catalog)

1. Back up the currently deployed package and verify the desired Cloudflare Time Travel recovery point.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project, preserving all `functions/` paths.
3. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged.
4. Do not reset D1 and do not clear browser storage.
5. Confirm `/version.json` reports `1.6.9-r12` after deployment.
6. Sign in with the administrator account, enable Admin View, open Team Builder, and use `＋ Classes / Jobs`.
7. Add a base class first when needed, then add its Basic Job. For a new specialization of an existing base class (such as Silver Hunter under Archer), add only the job under the existing class.
8. Verify new choices appear in Member Roster and Class Setup. Do not edit existing character assignments as part of this catalog setup.

This deployment is built directly from the r11 stable archive and retains its reset protections. It introduces no D1 schema migration. The new catalog setting is administrator-owned and append-only; member syncs and stale admin tabs preserve the server's committed catalog.

Live D1 deployment testing was not performed here. Keep the r11 package available as a rollback build, but do not roll back by resetting or clearing the database.
