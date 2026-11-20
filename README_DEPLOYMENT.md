# Deploy Pantheon Tools v1.6.9-r17

This project uses Cloudflare Pages Functions in the `functions/` directory. **Do not deploy this release using the Cloudflare dashboard drag-and-drop upload.** Cloudflare currently documents that dashboard drag-and-drop deployments do not compile a `functions/` directory; deploy this package with Wrangler instead.

## Deploy with Wrangler

1. Extract the complete ZIP to a folder. Open a terminal in that folder. It must contain `index.html`, `admin.html`, `version.json`, `_headers`, and the `functions/` directory directly at its root.
2. Install Node.js if needed. Sign in to Cloudflare once with `npx wrangler login`.
3. Deploy the folder to the existing Pages project:

   ```powershell
   npx wrangler pages deploy . --project-name=dntrckr
   ```

4. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not reset D1, run manual SQL, or clear browser storage.
5. Open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r16`. Also confirm the latest Pages deployment completed successfully.
6. No admin recovery action or database migration is required for this weekly-reset fix. The **Track all registered characters** recovery action from r15/r16 should only be run if it has never successfully completed; do not rerun it just for r17.
7. Refresh the Tracker after deployment. The next weekly reset will clear previous-cycle bounty text before resetting bounty-row statuses, while preserving any notes genuinely entered after the reset boundary.

If the project is Git-integrated rather than Direct Upload, deploy through its configured Git workflow instead of creating a separate Direct Upload project. Do not change the current Pages project type or D1 binding as part of this release.

See `Pantheon_Tools_v1.6.9-r17_README.md` for the tracking, account-link archive, member-sync authorization fix, weekly bounty-text reset fix, history-preservation, and validation details.
