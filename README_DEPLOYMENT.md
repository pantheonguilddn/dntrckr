# Deploy Pantheon Tools v1.6.9-r11

1. Back up the currently deployed Pages package.
2. Upload the complete contents of this ZIP to the existing Cloudflare Pages project, preserving the `functions/` paths.
3. Keep the existing D1 database binding, Discord OAuth settings, and environment variables unchanged.
4. Do not clear browser storage or reset D1.
5. Verify `/version.json` reports `1.6.9-r11`.
6. Keep the original administrator browser open until the startup check completes. If r11 identifies an old reset batch, the status will say the edits are held locally and that D1 progress was reloaded.
6. Confirm Universal View and the current week's character progress before attempting another Member Roster save.

This release defers automatic resets during Member Directory saves and protects all cell edits recorded at or after their scheduled reset boundary. If a previous release already committed reset edits to D1, the code cannot reconstruct those older values; use Cloudflare Time Travel only with the awareness that it restores the entire database.
