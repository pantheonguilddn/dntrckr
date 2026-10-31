# Pantheon Tools v1.6.8-r47 — persistent What's New dismissal

## What changed

- The What's New dismissal is now stored in both localStorage and a release-scoped cookie, so a normal navigation/reload does not repeatedly reopen the same release popup if localStorage is unavailable.
- The dismissal value remains tied to the installed build; a genuinely newer release can still show its own What's New popup.
- The Continue button and checkbox both persist the preference. Unchecking the option clears the saved dismissal so the next full app opening can show the release note again.
- Welcome-modal initialization is idempotent within a page runtime, preventing duplicate boot paths from reopening the same popup.
- The Help/Salary return-to-welcome path now uses the same shared dismissal check rather than reading localStorage alone.
- No authentication, D1 schema, API endpoint, tracker ownership, sync, Admin View, or other permission behavior changed.

## Deployment

Deploy the complete ZIP contents to the existing Cloudflare Pages project. Preserve the existing D1 binding and environment configuration. Verify `/version.json` reports `1.6.8-r47` after deployment.

## Validation boundary

Frontend JavaScript syntax, CSS parsing, package integrity, package-path preservation, release-marker consistency, and targeted dismissal behavior tests pass locally. This package has not been deployed to production or tested against live guild accounts.
