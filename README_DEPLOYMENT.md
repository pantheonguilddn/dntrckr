# Deploy Pantheon Tools v1.6.9-r14

1. Back up the current deployment and confirm the Cloudflare D1 recovery point.
2. Upload the complete ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged.
4. Do not reset D1, run manual SQL, clear browser storage, or re-register characters.
5. Confirm `/version.json` reports `1.6.9-r14`.
6. In Admin View → Admin Console → Player ownership audit, run **Track all registered characters** once. This restores Tracker inclusion for every registered IGN and preserves existing cloud task-cell and timing history.
7. Refresh the Tracker and ownership audit. New registrations will be included automatically.

This release is based on r13, retaining the r11-based Class / Job Catalog and the r13 Dungeon Registration task-index repair. It removes character-level Tracker opt-in and uses Member Roster registration as the single inclusion rule. No D1 schema migration is required. See `Pantheon_Tools_v1.6.9-r14_README.md` for data-safety details and validation limits.

The package was validated locally but has not been deployed or tested against the live Cloudflare D1 database in this environment.
