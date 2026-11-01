# Pantheon Tools v1.6.8-r53

## Changes in r53

- Admin View is now a permission toggle only. Enabling or disabling it no longer changes Personal/Universal View, the selected roster filter, or the current page. Its tooltip and pending-save message have been updated to match this behavior.
- Leaving Admin View As restores the administrator's previous Personal/Universal selection and roster filter.
- Members can change the display name for their own Pantheon roster from the Overview account card. This does not change their Discord username or stable Discord ID link, roster ID, character IGNs, or tracker progress.
- Confirmed Discord IDs now take priority over display names when resolving roster ownership, so a renamed member stays attached to the same roster. A first successful self-service rename confirms a previously unconfirmed link.
- The name endpoint updates only the authenticated member's profile and matching roster label using a compare-and-swap write, and refreshes the player ownership index when that storage is active.
- Existing Ledger access for Cho, Bio, and Cheean is retained if one of those members changes their display name; this permission remains administrator-managed.

## Deployment

Upload the contents of the ZIP to the existing Cloudflare Pages project using the usual deployment method. Keep the existing D1 database, binding, OAuth configuration, and environment variables. No manual SQL migration is required for r53. The new `PUT /api/profile/name` route uses the existing `pantheon-main` record and current player-storage index where available.

Do not clear browser storage, recreate the D1 database, or delete any existing records.
