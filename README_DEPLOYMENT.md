# Deployment - Pantheon Tools v1.6.9-r29

Deploy this package to the existing Cloudflare Pages project `dntrckr`. Do not create a new Pages project, change existing D1 bindings or secrets, run database migrations, reset D1, or clear browser storage.

## Deploy

From the extracted package directory, run:

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

Alternatively, use the existing connected Git deployment workflow.

## Verify

After deployment, open `https://dntrckr.pages.dev/version.json` and confirm `build` is `1.6.9-r29`. Then sign in and check:

- Tracker: Roster Analytics shows the per-character five-week trend and Personalized Task Priorities. The duplicate Character Activity Summary and deadline-strategy banner do not appear below it.
- Team Builder: 8-Man displays slots 1–4 in the upper group and slots 5–8 in the lower group. The Split Party Mechanic checkbox appears for 8-Man Normal and Hardcore, and toggling it updates the composition checks. In 8-Man Hardcore with the mechanic on, the DPS balance panel shows upper, lower, and combined Physical / Magical counts.
- Role Settings: heading, table, selectors, and role labels remain readable in Dark, Light, Eye Comfort, and Pastel themes.

## Notes

This release contains no database migration and does not modify D1 schema, bindings, secrets, member records, tracker cells, or weekly archives. Team Builder continues to save locally in each browser. The existing local Team 1 to 4-Man / 8-Man migration is retained; the legacy Team 2 is preserved only for compatibility and is not used in the current interface.
