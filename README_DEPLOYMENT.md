# Pantheon Tools v1.6.9-r18 Deployment

This release applies the approved clickable UI concept to the existing Pantheon app. It is a front-end-only update: the existing Pages Functions, D1 storage behavior, bindings, Discord OAuth, ownership checks, synchronization, Tracker categories, reset logic, and account archive controls are retained.

## Deploy

1. Extract the complete ZIP into a new folder. The folder root must contain `index.html`, `admin.html`, `version.json`, `_headers`, and `functions/`.
2. Sign in to Cloudflare with Wrangler if you have not already: `npx wrangler login`.
3. From the extracted folder, deploy to the existing Pages project:

   ```powershell
   npx wrangler pages deploy . --project-name=dntrckr
   ```

4. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not reset D1, run manual SQL, or clear browser storage.
5. After deployment, open `https://dntrckr.pages.dev/version.json` and confirm that `build` is `1.6.9-r18`.

For a Git-integrated Pages project, use its configured Git deployment workflow instead of creating a new Direct Upload project. Do not change the current Pages project type or D1 binding. Cloudflare Pages Functions must be deployed through Wrangler or the connected Git workflow, not by dragging only static files into the dashboard.

## What changed

- Added the mockup-style primary navigation rail for the existing Overview, Tracker, Team Builder, Card Database, Member Roster, and Help destinations.
- Placed the existing live Online Roster in the second rail column, preserving its real presence feed, profile actions, collapse behavior, and Guild Forum access.
- Restyled the actual app header, workspace cards, panels, buttons, and Tracker table.
- Added the warm Aegis theme and a segmented theme switcher for Guild, Aegis, Clean, Pastel, and Eye Comfort. The Pastel palette was refined.
- Kept the app's real Tracker category list from Dungeon Registration. No mockup-only Daily/Weekly tabs or Dailies section were introduced.

No one-time admin recovery action, D1 migration, or database reset is required for this UI update.
