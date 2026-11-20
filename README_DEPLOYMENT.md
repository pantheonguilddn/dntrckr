# Deployment — Pantheon Tools v1.6.9-r34

Deploy this package to the existing Cloudflare Pages project `dntrckr`. Do not create a new project, reset the D1 database, clear browser storage, or change existing bindings, secrets, or OAuth settings.

From the extracted package directory:

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

After deployment, verify `https://dntrckr.pages.dev/version.json` reports `1.6.9-r34`.

## Verify the Guild Hub banner

1. Open Overview and find the **Card background** selector on the PANTHEON GUILD HUB card.
2. Select **Pantheon emblem**. The card should display the uploaded Pantheon crest banner on its right side, with the text remaining readable on the left.
3. Switch between Dark, Light, Eye Comfort, and Pastel. The same emblem should recolor to suit the active palette.
4. Select any other background style to confirm the chooser still works.
5. Reload the page. The selected style should remain saved in that browser.

The package includes `pantheon-guild-hub-banner.png`; keep it beside `index.html` when deploying. The r33 default Wing facets selection is promoted to Pantheon emblem during the one-time local preference migration. Explicitly selected non-default background styles are preserved.

This release changes the Guild Hub card decoration, its local preference default/migration, the image asset, and version/release documentation. It does not migrate or modify D1 data, schema, backend functions, authentication, synchronization, or historical Tracker records.
