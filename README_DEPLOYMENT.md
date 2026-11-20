# Deployment — Pantheon Tools v1.6.9-r49

Deploy the complete extracted package to the existing Cloudflare Pages project `dntrckr` using the established Wrangler or connected Git workflow.

```powershell
npx wrangler pages deploy . --project-name=dntrckr
```

Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, clear browser storage, or run manual SQL. This release does not require a D1 migration.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r49`. The in-page `PANTHEON_TOOLS_VERSION`, auto-refresh `CURRENT_BUILD`, and `version.json.build` markers are synchronized.

Build r49 updates the Tracker Focus Guide to match the supplied reference: the selected character column receives a continuous, subtle theme-aware tint from its IGN header through the final task row, preserving task-state/N/A fills. The Weekly Completion Rate footer is excluded. Matching dungeon-name and category cells remain fully inverted; other character cells on the hovered row retain a faint highlight.
