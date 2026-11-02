# Pantheon Tools v1.6.9-r02 — D1 read-amplification correction

## Why this release exists

Cloudflare D1 usage was observed at 97% of the read allowance. Inspection of r01 found a client-side read-amplification issue: calls marked `force:true` on browser focus, visibility changes, and in-app page navigation caused the client to download the full Tracker even when the server revision had not changed. The full response hydrates character cells and completion timing, so repeating it can rescan the same stored rows unnecessarily.

## Changes

- A forced freshness check now checks the server revision, but does not force a full Tracker download when the revision is unchanged.
- The full Tracker is downloaded only on the first check or when the server-reported revision differs from the last acknowledged revision.
- A five-second client-side coalescing guard prevents back-to-back focus, visibility, page-navigation, and polling events from issuing duplicate revision checks.
- Returning to a browser tab no longer bypasses the online-member list's normal freshness throttle. Initial load and the explicit Retry action remain immediate.
- Retains r01's category-based protection for Bounty Board claim rows, Extra Dungeons default-N/A behavior, per-character saves, local outbox, server acknowledgements, retries, and tracker DOM responsiveness optimizations.

## Data and deployment safety

- No D1 schema change or migration is required.
- No database reset, browser-storage clearing, or re-registration is required.
- Keep the existing `PANTHEON_DB` binding, Discord OAuth secrets, and other Cloudflare environment settings unchanged.
- Server-side per-character cell writes and ownership checks are unchanged.

## Validation limits

The change was checked locally for expected code paths, JavaScript syntax, HTML/CSS structure, release markers, ZIP integrity, and preservation of the r01 registration safeguards. This environment cannot inspect the live Cloudflare account's D1 query activity or certify a measured production reduction. After deployment, compare the D1 Rows Read rate against the previous day and inspect query activity if usage remains unexpectedly high.
