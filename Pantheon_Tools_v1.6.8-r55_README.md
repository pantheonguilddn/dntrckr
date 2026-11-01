# Pantheon Tools v1.6.8-r55

## Changes

- Disabled the What's New / release popup for this patch build. Normal account setup, profile confirmation, and weekly report flows remain separate.
- Hardened the character-progress outbox. Each checkbox/note edit is written synchronously to browser local storage before the save request starts. Unconfirmed edits remain queued if a request is interrupted by closing the browser.
- On the next authenticated visit, persisted pending edits are re-armed and submitted automatically after player storage readiness is confirmed.
- Transient save failures now retry with exponential backoff capped at 60 seconds instead of stopping permanently after five attempts. Returning to the tab or reconnecting triggers an immediate retry. A best-effort keepalive flush is also attempted when leaving the page.
- Requesting persistent browser storage is now best-effort on supported browsers to reduce automatic eviction risk.
- Expanded Admin Console > Player ownership audit into a full Discord-link manager. Administrators can assign, replace, or clear each member's approved Discord account. The protected bootstrap Admin personal-owner link cannot be cleared or moved. Character registrations and saved task progress are preserved.

## Important sync behavior

A browser cannot transmit while it is fully closed. The app therefore keeps every unacknowledged character edit in a local outbox and automatically retries it when the same browser profile next opens Pantheon and authenticates. Once the server returns a matching saved value, that queue entry is removed. If browser/site data is manually cleared, the browser denies storage, or a permanent account/ownership validation error occurs, automatic delivery cannot be guaranteed; the status message will identify an unconfirmed edit rather than claim it was saved.

Each character's task writes continue to use the independent D1 character-cell endpoint. They do not rely on another member's edits or on the full shared-record write completing.

## Deployment

Upload the contents of this ZIP to the existing Cloudflare Pages project. No SQL migration, manual D1 command, database reset, or clearing of browser storage is required. Existing D1 records and pending browser queues are preserved.

## Verification

- Inline JavaScript syntax checks passed.
- Admin ownership-link route syntax checks passed.
- Queue recovery, retry backoff, popup suppression, and link-management invariants were checked in the local source.
- ZIP integrity and package-file checks passed.
- This package has not been deployed to or live-tested against the production Cloudflare D1 database from this environment.
