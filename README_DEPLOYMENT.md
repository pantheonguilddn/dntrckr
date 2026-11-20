# Deployment - Pantheon Tools v1.6.9-r28

Deploy this package to the existing Cloudflare Pages project `dntrckr`. Do not create a new Pages project, change existing D1 bindings or secrets, run database migrations, reset D1, or clear browser storage.

## Deploy

From the extracted package directory, run:

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

Alternatively, use the existing connected Git deployment workflow.

## Verify

After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r28`. Then sign in and check Tracker and Team Builder.

## Notes

This release contains no database migration and does not modify D1 schema, bindings, secrets, member records, tracker cells, or weekly archives. Tracker Roster Analytics no longer repeats Overview's Character Activity Summary or deadline-strategy recommendations; historical character trend cards remain subject to the existing analytics preference.

Team Builder is local-only: each browser has one 4-Man layout and one 8-Man layout, each containing one party and a separately remembered Normal / Hardcore difficulty selection. On first load, the previous Team 1 assignments seed both sizes: the first four slots populate 4-Man, and all eight slots populate 8-Man. The layouts and difficulty selections are then independent. The unused legacy Team 2 field is preserved but is not shown or used. No browser storage is cleared.
