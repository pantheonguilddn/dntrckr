# Deployment — Pantheon Tools v1.6.9-r36

Deploy to the existing Cloudflare Pages project `dntrckr`. Do not create a new project, reset D1, clear browser storage, or change bindings, secrets, or OAuth settings.

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r36`.

## Verify Guild Hub presentation

1. Confirm the Card background selector is on its own row directly below the Guild Hub card, not over the emblem.
2. Select **Pantheon emblem** and check that the image softly dissolves on all edges into the card surface, with no visible rectangular boundary.
3. Switch through Dark, Light, Eye Comfort, and Pastel. The image treatment should adapt to each theme.
4. Try the other background options; the local selection should still persist.
5. Check a narrow viewport to ensure the separate selector row remains readable and the emblem does not cover the text.

Keep both `pantheon-guild-hub-banner.png` (the original upload) and `pantheon-guild-hub-banner-feathered.png` (the rendered feathered asset) beside `index.html`.

This release does not migrate or modify D1 data, schema, backend functions, authentication, synchronization, or historical Tracker records.
