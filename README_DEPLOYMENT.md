# Deployment — Pantheon Tools v1.6.9-r35

Deploy this package to the existing Cloudflare Pages project `dntrckr`. Do not create a new project, reset the D1 database, clear browser storage, or change existing bindings, secrets, or OAuth settings.

From the extracted package directory:

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

After deployment, verify `https://dntrckr.pages.dev/version.json` reports `1.6.9-r35`.

## Verify the Pantheon emblem blend

1. Open Overview and select **Pantheon emblem** in the Guild Hub card's **Card background** control.
2. Check that the emblem remains right-aligned and the left edge gradually fades into the card surface rather than forming a visible cutoff.
3. Switch between Dark, Light, Eye Comfort, and Pastel; the gradient and soft glow should follow each theme's surface and accent colors.
4. Check a narrow/mobile viewport; the stronger fade should leave the text readable.
5. Select another background style to confirm the background selector still works.

Keep `pantheon-guild-hub-banner.png` beside `index.html` when deploying.

This release changes only Guild Hub decorative styling, version markers, and release documentation. It does not migrate or modify D1 data, schema, backend functions, authentication, synchronization, or historical Tracker records.
