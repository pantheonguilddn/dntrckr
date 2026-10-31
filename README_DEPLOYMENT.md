# Pantheon Tools v1.6.8-r43 — one Discord identity, personal Cho view, optional Admin View

## What changed

- The bootstrap administrator is represented as one authenticated Discord account with a separate permission role and working mode. The account opens in Cho Personal View; Admin View remains an explicit toggle.
- Added `BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME` as an optional Pages environment variable. It defaults to `Cho`, per the requested personal default. It is derived server-side and is not accepted from browser input.
- Owner resolution now selects the configured personal owner even when the same Discord ID was accidentally attached to multiple Member Roster entries. It no longer treats the Admin role as a second roster identity.
- On the first successful Personal View write, the server repairs the duplicate account links: it keeps the verified Discord ID on the canonical personal owner and clears only that duplicate ID from other entries. It does not delete member records, characters, classes, tracker rosters, or progress.
- Client identity selection, server registration validation, cell-save analytics attribution, and Ledger identity checks use the same canonical owner resolver.
- Ordinary members still resolve by their unique confirmed Discord link (or unique label/username fallback). A preferred personal owner already confirmed to a different Discord ID is rejected rather than taken over.
- Retains r42's startup initialization fix, r41's Admin View permission toggle, per-character acknowledged saves, server timestamping, CAS writes, cache-bypassing refresh, and existing Pages routes/database schema.

## Deployment

1. Deploy the complete ZIP contents to the existing Cloudflare Pages project. Do not upload only `index.html`.
2. Preserve the existing D1 database and bindings, Discord OAuth credentials, and `BOOTSTRAP_ADMIN_DISCORD_ID` secret.
3. No D1 schema migration is required. If desired, set `BOOTSTRAP_ADMIN_PERSONAL_OWNER_NAME=Cho`; the application defaults to Cho when this optional variable is absent.
4. Verify `/version.json` reports `1.6.8-r43`.
5. Test the bootstrap administrator in Cho Personal View first, including the retained `Vaelyth → Theme Park (Jelly x5)` edit. Confirm it saves and the duplicate Discord-ID link is repaired. Then enable Admin View and verify the separate administrator controls appear. Finally test an ordinary member account to confirm it remains limited to its own roster.

## Validation boundary

Local checks cover JavaScript syntax for every Pages Function and inline app script, CSS parsing, HTML ID uniqueness, package integrity and path preservation, deterministic canonical-owner selection, duplicate-link repair, and rejection when Cho is already confirmed to a different Discord ID. Live Cloudflare/D1/Discord multi-account testing is still required after deployment.
