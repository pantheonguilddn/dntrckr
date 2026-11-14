# Pantheon Tools v1.6.9-r16 — member roster sync authorization fix

## Base and retained features

Built directly from the r15 deployment package. Retains automatic Tracker inclusion for every registered Member Roster character, the one-time **Track all registered characters** recovery action, former-member Discord account-link archive/restore controls, the r11-based Class / Job Catalog, and the r13 Dungeon Registration task-index repair.

## Fix: members saving their own roster no longer rewrite other members' rosters

- Fixed a server-side projection bug in `/api/cloud/b/[id]`.
- Previously, a member's own profile or character-registration save rebuilt the Tracker roster projection for every Member Roster entry. If another member had legacy roster characters that differed from their Member Roster registration, the server attempted to rewrite that unrelated roster and the ownership guard correctly returned `403 Members cannot edit another member’s Tracker roster.`
- Normal member operations now project only the member IDs in the authenticated request's approved Member Roster intents.
- Other members' Tracker roster records are preserved unchanged during a member's save, including legacy roster contents. Admin Mode operations can still perform the full projection.
- The authorization guard remains enabled. An attempted cross-member registration edit is still rejected. This fix does not grant members permission to edit other members' profiles, characters, or Tracker rosters.

## Data and history preservation

- The fix does not delete or rewrite task cells, completion-timing history, character ownership rows, or another member's roster.
- It does not require a D1 reset, browser-storage clearing, manual SQL, or member re-registration.
- Automatic tracking and the account-link archive/restore behavior from r15 remain in place.

## Deployment

Deploy the complete package to the existing `dntrckr` Cloudflare Pages project using Wrangler or the project's existing Git deployment workflow. Do not use dashboard drag-and-drop for this Functions-based app. Keep the current D1 binding, Discord OAuth settings, secrets, and environment variables. See `README_DEPLOYMENT.md`.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r16`. The one-time **Track all registered characters** recovery action only needs to be run if it has not already been successfully completed after r15; do not run it repeatedly just for this sync fix.

## Validation

- Node syntax checks passed for all Pages Function modules and inline JavaScript in both HTML files.
- HTML parser checks passed for `index.html` and `admin.html`.
- ZIP integrity and root layout checks passed.
- Regression tests reproduced the legacy cross-member roster mismatch and confirmed: own metadata updates pass; own character registration updates pass; unrelated member rosters remain unchanged; attempts to edit another member's registration remain rejected.
- Tests were run against local package code with mocked data. No live Cloudflare deployment or production D1 records were accessed.
