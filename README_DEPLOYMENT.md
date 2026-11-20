# Deployment — Pantheon Tools v1.6.9-r50

Deploy the complete extracted package to the existing Cloudflare Pages project `dntrckr` using the established Wrangler or connected Git workflow.

```powershell
npx wrangler pages deploy . --project-name=dntrckr
```

Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, clear browser storage, or run manual SQL. This release does not require a D1 migration.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r50`. The in-page `PANTHEON_TOOLS_VERSION`, auto-refresh `CURRENT_BUILD`, and `version.json` markers are synchronized.

Build r50: selected character cells—including main-character cells—and the selected character's Weekly Completion Rate footer cell now invert like the IGN header. The matching dungeon/category cells remain inverted, while other characters' cells on the active task row retain the faint highlight.
