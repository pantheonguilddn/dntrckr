# Deploy Pantheon Tools v1.6.9-r20

This is a Cloudflare Pages project with Pages Functions in `functions/`. Deploy through the existing Git integration or Wrangler. Do not use dashboard drag-and-drop for this Functions project.

1. Extract this ZIP into a new folder. At its root you should see `index.html`, `admin.html`, `version.json`, `_headers`, `schema.sql`, and `functions/`.
2. Open a terminal in that folder. Authenticate if needed: `npx wrangler login`.
3. Deploy to the existing Pages project: `npx wrangler pages deploy . --project-name=dntrckr`.
4. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, run manual SQL, or clear browser storage.
5. Open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r20`.

This is a front-end UI release only. Existing Pages Functions, app APIs, stored data, tracker history, and sync behavior are retained. No database migration or Admin recovery action is needed.
