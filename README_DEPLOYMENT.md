# Deploy Pantheon Tools v1.6.9-r15

This project uses Cloudflare Pages Functions in the `functions/` directory. **Do not deploy this release using the Cloudflare dashboard drag-and-drop upload.** Cloudflare currently documents that dashboard drag-and-drop deployments do not compile a `functions/` directory; deploy this package with Wrangler instead.

## Deploy with Wrangler

1. Extract the complete ZIP to a folder. Open a terminal in that folder. It must contain `index.html`, `admin.html`, `version.json`, `_headers`, and the `functions/` directory directly at its root.
2. Install Node.js if needed. Sign in to Cloudflare once with `npx wrangler login`.
3. Deploy the folder to the existing Pages project:

   ```powershell
   npx wrangler pages deploy . --project-name=dntrckr
   ```

4. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not reset D1, run manual SQL, or clear browser storage.
5. Open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r15`. Also confirm the latest Pages deployment completed successfully.
6. Sign in as the administrator, turn on Admin View, then open Admin Console → Player ownership audit → **Track all registered characters**. Confirm and run it once. This repairs existing registrations in D1 while preserving task cells and completion-timing history.
7. Refresh the Tracker and ownership audit. Future Member Roster registrations are included automatically.

If the project is Git-integrated rather than Direct Upload, deploy through its configured Git workflow instead of creating a separate Direct Upload project. Do not change the current Pages project type or D1 binding as part of this release.

See `Pantheon_Tools_v1.6.9-r15_README.md` for the tracking, account-link archive, history-preservation, and validation details.
