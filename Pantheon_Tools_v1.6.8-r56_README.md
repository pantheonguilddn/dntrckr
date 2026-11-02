# Pantheon Tools v1.6.8-r56

## Extra Dungeons

- Admin Console now includes an **Extra Dungeons** section.
- Administrators can mark any listed weekly dungeon task as extra using checkboxes grouped by the existing dungeon category.
- Tagged tasks remain visible and editable in the Tracker. Existing checkbox states, task cells, and reset behavior are unchanged.
- Tagged tasks are excluded from weekly completion-rate denominators and numerators, Overview eligible-task totals and pending counts, archived completion trends, and the Previous Week Report totals.
- The selection is stored in the shared D1-backed `pantheon-main` guild record. Members cannot overwrite it with stale browser data; the tracker API preserves the authoritative setting on normal whole-record writes.
- The Admin Console endpoint uses compare-and-swap writes and retries if the shared main record changes while settings are being saved.
- The release What's New popup remains disabled. Profile confirmation and weekly report notices are unchanged.

## Deployment

Upload the contents of this ZIP to the existing Cloudflare Pages project. The new endpoint is `functions/api/admin/extra-dungeons.js`. No SQL schema migration, D1 reset, or manual data import is required. Existing task progress and character ownership are preserved.

After deployment, open **Admin Console → Extra Dungeons**, select the optional weekly dungeons, and press **Save Extra Dungeons**. Other clients receive the shared selection on their normal background refresh; a reload will also pick it up.

## Validation

The package is checked for JavaScript syntax, HTML duplicate IDs, CSS parse errors, compact-record round trips, completion-rate calculations, API validation and compare-and-swap behavior, and ZIP integrity. Production behavior still requires deployment to the live Cloudflare Pages/D1 environment.
