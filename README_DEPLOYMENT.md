# Deployment — Pantheon Tools v1.6.9-r38

Deploy to the existing Cloudflare Pages project `dntrckr`. Do not create a new project, reset D1, clear browser storage, or change bindings, secrets, or OAuth settings.

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r38`.

## Verify Guild Hub appearance

1. Sign in with the Pantheon administrator account and enable Admin View.
2. On Overview, confirm the Guild Hub background selector is visible in its separate row below the card.
3. Choose each background style and confirm the change is saved to the shared record.
4. Sign in as a regular member or open another member session. Confirm the chosen background is visible but the selector is hidden.
5. Try a regular member sync and confirm it cannot overwrite the shared Guild Hub background.
6. Switch between Dark, Light, Eye Comfort, and Pastel. Confirm the animated smoke colors adapt to each theme and no yellow haze remains.
7. Confirm reduced-motion settings disable the smoke animation.

## What changed

- Replaced the previous accent haze with a slow animated smoke swirl, using theme-specific muted tones (silver-blue, blue mist, muted sage, and lavender-blue).
- Added reduced-motion support; animation is disabled for users who request reduced motion.
- Changed Guild Hub background selection from a local browser preference to a shared admin-owned setting in the existing `settings` object.
- The selector is visible only to an authenticated administrator while Admin View is enabled and View As is inactive.
- The cloud API validates the allowed background values and preserves the committed value during all non-admin syncs.
- No new D1 table or schema migration is required.

The D1 schema, character storage, tracker history, authentication model, bindings, secrets, and OAuth configuration are not changed. Existing tracker records are preserved.
