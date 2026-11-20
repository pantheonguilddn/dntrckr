# Deployment — Pantheon Tools v1.6.9-r37

Deploy to the existing Cloudflare Pages project `dntrckr`. Do not create a new project, reset D1, clear browser storage, or change bindings, secrets, or OAuth settings.

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r37`.

## Verify Overview

1. Open Overview and confirm the Guild Hub card appears first.
2. Confirm the Card Background selector appears in its own row immediately below the card.
3. Confirm all five summary metrics appear below the selector.
4. Confirm the Activity Insights carousel is visible and navigable.
5. Confirm Character Completion appears below Activity Insights.
6. Switch among Dark, Light, Eye Comfort, and Pastel, and check the Pantheon emblem blend.

This release does not migrate or modify D1 data, schema, backend functions, authentication, synchronization, or historical Tracker records. It does not clear browser-local background preferences.
