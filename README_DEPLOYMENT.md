# Deployment — Pantheon Tools v1.6.9-r46

Deploy the complete extracted package to the existing Cloudflare Pages project `dntrckr` using the established Wrangler or connected Git workflow.

```powershell
npx wrangler pages deploy . --project-name=dntrckr
```

Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, clear browser storage, or run manual SQL. This release does not require a D1 migration.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r46`. The in-page `PANTHEON_TOOLS_VERSION`, auto-refresh `CURRENT_BUILD`, and `version.json.build` markers have been checked for exact consistency in this package.


Build r46: fixes Tracker Focus Guide hover cleanup and dungeon-name row inversion.
