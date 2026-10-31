# Pantheon Tools v1.6.8-r42 — startup initialization hotfix

## Critical fix

- Fixes the r41 login-screen lockout. The server-clock offset is now initialized **before** `createEmptyData()` runs. The data factory calls `getTargetResetTimeUTC()`, which calls `pantheonNow()`; r41 declared the offset later, triggering a JavaScript Temporal Dead Zone `ReferenceError` during initial script execution. Because that stopped the app before its DOMContentLoaded authentication boot handler, users returned from Discord authorization to the login gate.
- This is an initialization-order fix only. It does not change Discord OAuth, session cookies, D1 schema, allowlist records, authentication middleware, tracker merge rules, or the r41 permission-mode changes.

## Deployment

Deploy the complete ZIP contents to the existing Cloudflare Pages project. Keep `_headers`, `version.json`, and the entire `functions/` directory. Do not reset or replace the D1 database or alter Discord OAuth settings.

After deployment, verify `https://dntrckr.pages.dev/version.json` reports `1.6.8-r42`. Then test Discord login with both an ordinary member account and the administrator account before inviting the guild back in.

## Validation

- Verified the server-clock binding is initialized before `createEmptyData()` and that its only declaration is unique.
- All inline application scripts pass `node --check`.
- All Pages Function JavaScript files pass `node --check`.
- Confirmed the r42 HTML build markers, `version.json`, ZIP integrity, and package file paths.
- This is local validation only; production Cloudflare Pages/D1 and real Discord callback testing still must be confirmed after deployment.
