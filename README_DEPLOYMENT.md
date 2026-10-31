# Pantheon Tools v1.6.8-r44 — compact Admin switch and read-only Universal View

## Changes in r44

- Replaces the wide Admin View text button with a compact, theme-aware on/off switch. The existing Admin View permission model and toggle handler are retained.
- The Admin switch displays only the short label `Admin` and its on/off track, reducing the width added to the top toolbar.
- Admin permission and viewing scope are independent. With Admin View off, the administrator account may switch between Personal View and Universal View.
- Universal View is read-only for other members' characters. The authenticated account may still edit only its own registered characters. The existing per-cell owner checks and server-side member-safe writes are retained.
- Removes the navigation behavior that forcibly reset every non-admin Tracker visit to Personal View. The initial login still defaults to the authenticated account's Personal View; the selected Personal/Universal scope is preserved while navigating between pages.
- Returning from Admin View still defaults to the canonical personal roster (Cho), after pending edits are confirmed. The user can then switch to Universal View without enabling Admin View.

## Preserved from r43

- One Discord identity with a canonical personal owner and optional Admin View.
- Duplicate Discord-ID roster link repair behavior.
- Startup initialization order fix from r42.
- Per-character acknowledged cell saves, retry queue, server timestamping, compare-and-swap writes, and cache-bypassing refresh behavior.
- Existing Pages Functions, database schema, OAuth callback, session handling, and access-control routes are carried forward unchanged.

## Deployment

1. Deploy the complete ZIP contents to the existing Cloudflare Pages project. Do not upload only `index.html`.
2. Preserve the existing D1 database/binding, Discord OAuth configuration, and Pages environment variables.
3. Verify `https://dntrckr.pages.dev/version.json` reports `1.6.8-r44` after deployment.
4. Test the administrator account in Cho Personal View, switch to Universal View with Admin off, verify other members' cells and bounty notes are read-only, and confirm Cho's own cells remain editable.
5. Switch Admin View on and verify authorized administrator editing; switch it off again and confirm the UI returns to Cho Personal View while Universal View remains available.
6. Test a normal member account separately to confirm it can view the guild board but can edit only its own registered characters.

## Validation boundary

This release is built locally from the complete r43 Cloudflare Pages package and preserves its archive paths and server functions. Local structural, JavaScript syntax, CSS parsing, archive integrity, and targeted view/permission regression checks are performed. No production deployment or live multi-account D1 test is claimed by this package.
