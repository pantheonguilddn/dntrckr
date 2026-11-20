# Pantheon Tools v1.6.9-r45

## Authentication / reload-loop correction

- Fixed a release-version mismatch in the automatic update checker. The r44 page declared `PANTHEON_TOOLS_VERSION` and `version.json` as r44, but the auto-refresh script still declared `CURRENT_BUILD` as r43.
- Because the update checker compares `/version.json` against `CURRENT_BUILD`, it treated r44 as a newer release on every page load and repeatedly scheduled a reload. That repeated reload could interrupt the session gate and appear as a login / Overview bounce.
- Synchronized all three markers to `1.6.9-r45`: `PANTHEON_TOOLS_VERSION`, `CURRENT_BUILD`, and `version.json.build`.
- Added a package-time consistency assertion to confirm the three markers match.

## Preserved

- Based on r44. No Discord OAuth callback, session-cookie, authentication API, middleware, allowlist, ownership, D1 schema, Pages Function, or stored Tracker data was changed.
- No D1 migration, database reset, browser-storage clearing, or secret/binding changes are required.
- Existing r44 Tracker row/column Focus Guide changes are retained.

## Validation performed

- Confirmed all three release markers match exactly.
- Checked the auto-refresh comparison now evaluates remote r45 as equal to local r45, so it does not queue another reload.
- JavaScript syntax checks for all inline scripts and all 31 Pages Function modules.
- HTML parser, CSS parsing, duplicate-ID, and ZIP integrity checks.
- Compared all 31 Pages Function files against r44; byte-for-byte unchanged.

This is a source/package correction and has not been deployed to Cloudflare. A live browser sign-in test remains necessary after deployment.
