# Pantheon Tools v1.6.8-r46 — compact top navigation

## What changed

- Shortened the Tracker roster dropdown from 148px to 124px on desktop, reducing the horizontal pressure in the top navigation.
- Reduced the dropdown height to 34px and tightened its internal padding.
- Removed the extra left margin from the adjacent `?` help control and fixed its flex basis/vertical alignment so it stays centered beside the dropdown.
- Kept responsive wrapping on narrower viewports; on mobile the dropdown can flex naturally instead of forcing overflow.
- No authentication, synchronization, ownership, Admin View, D1 schema, or server-function behavior changed.
- Version markers and `version.json` are synchronized to `1.6.8-r46`.

## Deployment

Deploy the complete ZIP contents to the existing Cloudflare Pages project. Preserve the existing D1 binding and environment configuration. Verify `/version.json` reports `1.6.8-r46` after deployment.

## Validation boundary

The package structure is preserved and the frontend syntax, CSS parsing, archive integrity, and version-marker consistency are checked locally. This package has not been deployed to production or verified against live guild accounts.
