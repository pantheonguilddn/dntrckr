# Deployment - Pantheon Tools v1.6.9-r31

Deploy this package to the existing Cloudflare Pages project `dntrckr`. Do not create a new project, reset the D1 database, clear browser storage, or change existing bindings/secrets/OAuth settings.

From the extracted package directory:

```powershell
npx wrangler login
npx wrangler pages deploy . --project-name=dntrckr
```

After deployment, verify `https://dntrckr.pages.dev/version.json` reports `1.6.9-r31`.

Then check:
- In Team Builder, select a main character and use Share Party Setup. The PNG should retain the `★ Main` label but show normal thin card borders with readable text. Confirm the live builder still highlights main characters normally.
- Switch Dark, Light, Eye Comfort, and Pastel. The Role Settings header button should have readable text in each theme. Open the modal and check the Save Role Settings action too.

This release changes only `index.html` styles/share-clone behavior, version markers, and release documentation. Backend, D1 schema/data, authentication, synchronization, and stored Tracker history are unchanged.
