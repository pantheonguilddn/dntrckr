# Pantheon Tools v1.6.8-r54

## Changes

- Removed the redundant account/roster identity dropdown from the top bar.
- Kept one roster selector: **Show All Rosters** and **Only [member]**. Personal identity continues to resolve automatically from the authenticated Discord account and its confirmed roster link.
- Removed all UI logic that depended on manually selecting an identity from the removed dropdown. Personal View now relies on the account-linked roster ID; Universal View leaves the single **Only** selector available for read-only member filtering when Admin View is off.
- Fixed Admin Tools hamburger visibility. The menu, drawer, and scrim now honor the hidden state explicitly, so they do not appear for ordinary members or when an administrator has Admin View turned off.

## Preserved

- No D1 schema or migration changes.
- No changes to Discord ID links, member IDs, roster IDs, character ownership, progress cells, or completion history.
- Admin View and Personal/Universal View remain independent.
- The remaining **Only [member]** selector is the single person-filter dropdown.

## Deployment

Deploy the ZIP contents to the existing Cloudflare Pages project. Keep the current D1 binding, database, OAuth settings, environment variables, and allowlist unchanged. No manual SQL, database reset, or browser-storage clearing is required.

After deployment, verify:
1. Only one person-selection dropdown appears in the top bar, containing the **Only [member]** options.
2. The selector still filters the tracker to the selected member in Universal View.
3. An ordinary member does not see the Tools hamburger.
4. An administrator with Admin View turned off does not see the Tools hamburger; turning Admin View on reveals it.
