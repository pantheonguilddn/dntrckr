# Deploy Pantheon Tools v1.6.9-r23

This package updates the existing Pantheon Tools Cloudflare Pages project. It is not a new project and does not require a D1 migration.

## Deploy

1. Extract this ZIP into a new folder. The folder should contain `index.html`, `admin.html`, `functions/`, `_headers`, `schema.sql`, and `version.json` directly.
2. From that folder, run `npx wrangler login` if you have not authenticated Wrangler on this machine.
3. Deploy to the existing Pages project: `npx wrangler pages deploy . --project-name=dntrckr`.
4. Verify `https://dntrckr.pages.dev/version.json` reports `1.6.9-r23`.

For a Git-integrated Pages project, commit the package files to its existing deployment branch and use the existing Git deployment. Do not create a new Pages project, alter D1 bindings/secrets/environment variables, reset the database, or clear browser storage. Do not use dashboard ZIP drag-and-drop for Pages Functions.

## Data safety

This is a presentation and client-side layout release. It does not change `functions/`, database schema, authentication, ownership, saved task cells, weekly archives, or completion history. Guild Forum and Salary Calculator remain full workspace pages with their existing controls.
