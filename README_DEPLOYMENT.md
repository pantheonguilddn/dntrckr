# Deployment - Pantheon Tools v1.6.9-r27

Deploy this package to the existing Cloudflare Pages project `dntrckr`.

From the extracted package root (where `index.html`, `admin.html`, and `functions/` are directly present):

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

Alternatively, use the existing Git-connected deployment workflow for the same Pages project.

Do not create a new Pages project, change D1 bindings/secrets/environment variables, reset the database, or clear browser storage. This revision requires no D1 migration. Existing historical analytics and Tracker records are retained.

After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r27`.
