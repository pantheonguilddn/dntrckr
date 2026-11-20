# Deployment - Pantheon Tools v1.6.9-r24

Deploy this package to the existing Cloudflare Pages project `dntrckr`.

From the extracted package root (where `index.html`, `admin.html`, and `functions/` are directly present):

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

Alternatively, use the existing Git-connected deployment workflow for the same Pages project.

Do not create a new Pages project, change D1 bindings/secrets/environment variables, reset the database, or clear browser storage. This is a front-end-only revision; no D1 migration or recovery action is required.

After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r24`.
