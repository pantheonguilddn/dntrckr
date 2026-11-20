# Deploy Pantheon Tools v1.6.9-r19

This is a Cloudflare Pages project with Pages Functions in the `functions/` directory. Deploy it through the existing Git integration or Wrangler. Do not use dashboard drag-and-drop for this Functions project.

## Wrangler deployment

1. Extract the ZIP into a new folder. At its root you should see `index.html`, `admin.html`, `version.json`, `_headers`, `schema.sql`, and the `functions/` directory.
2. Open a terminal in that folder. Authenticate if needed with `npx wrangler login`.
3. Deploy to the existing Pages project:

   ```powershell
   npx wrangler pages deploy . --project-name=dntrckr
   ```

4. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, run manual SQL, or clear browser storage.
5. Open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r19`.

This release changes the interface only. No database migration or Admin recovery action is needed. The real Tracker categories and data remain the ones configured in the current Pantheon app.

For a Git-integrated Pages project, use its configured Git workflow instead of Wrangler.
