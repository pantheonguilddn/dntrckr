# Deploy Pantheon Tools v1.6.9-r51

Deploy the complete extracted package to the existing Cloudflare Pages project `dntrckr` using the established Wrangler or connected Git workflow.

```powershell
npx wrangler pages deploy . --project-name=dntrckr
```

Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, clear browser storage, or run manual SQL. This release does not require a D1 migration.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r51`. The app version, auto-refresh `CURRENT_BUILD`, and `version.json` markers are synchronized.

r51 corrects the Tracker Focus Guide: the selected IGN header and matching Weekly Completion Rate cell invert fully, while the cells between them receive a faint overlay that preserves each cell's existing status and main-character appearance. The hovered task-name/category cells still invert, other character cells on that row retain the faint row guide, and all highlights clear when hover ends.
