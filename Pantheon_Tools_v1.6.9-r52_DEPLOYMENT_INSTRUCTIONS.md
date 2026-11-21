# Deployment — Pantheon Tools v1.6.9-r52

Deploy the complete extracted package to the existing Cloudflare Pages project `dntrckr`.

```powershell
npx wrangler pages deploy . --project-name=dntrckr
```

Alternatively, use the existing Git-connected Cloudflare Pages deployment workflow.

Keep the current D1 binding, Discord OAuth configuration, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, clear browser storage, or run manual SQL. This release requires no database migration.

After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r52`.
