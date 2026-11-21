# Deploy Pantheon Tools v1.6.9-r52

Deploy the complete extracted package to the existing Cloudflare Pages project `dntrckr` using the established Wrangler or connected Git workflow.

```powershell
npx wrangler pages deploy . --project-name=dntrckr
```

Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not create a new Pages project, reset D1, clear browser storage, or run manual SQL. This release does not require a D1 migration.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r52`. The app version, auto-refresh `CURRENT_BUILD`, and `version.json` markers are synchronized.

r52 makes Overview Activity Insights adaptive and evidence-based: fresh resets no longer trigger 0% or generic not-started alerts; the carousel uses a personalized next-task suggestion, the latest saved-week baseline, actual current-week activity, historical character habits, material trends, and late-week priorities only when the relevant evidence and timing exist.
