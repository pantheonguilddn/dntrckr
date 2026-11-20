# Deployment - Pantheon Tools v1.6.9-r30

This package updates the existing Pantheon Tools Cloudflare Pages project. Deploy into the existing `dntrckr` project; do not create a new Pages project and do not reset or replace the D1 database.

## Deploy

From this extracted directory, run:

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

Alternatively, use the repository's existing Pages deployment workflow. Preserve all existing Cloudflare Pages bindings, environment variables, secrets, OAuth configuration, and D1 database bindings. No SQL migration is required for this release.

## Verify after deployment

Open `https://dntrckr.pages.dev/version.json` and confirm the build is `1.6.9-r30`. Then sign in and check:

- Role Settings button text remains readable in Dark, Light, Eye Comfort, and Pastel themes.
- Roster Analytics character cards display in a wide horizontal carousel with swipe/scroll and previous/next controls.
- Team Builder Share copies or downloads an image reflecting the selected 4-Man or 8-Man layout, including 4 + 4 rows for 8-Man, role descriptions, and the active theme.

This release does not alter the D1 schema, authentication, tracker synchronization, or historical records. Do not clear browser storage. Team Builder remains local-save.
