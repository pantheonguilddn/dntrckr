# Pantheon Tools v1.6.9-r17 — weekly bounty text reset fix

## Fix: previous-week bounty text now clears reliably

- The weekly reset now records which Bounty Board notes were last changed before the reset boundary before it resets any weekly cell statuses.
- It then clears those previous-cycle notes, after status resets have been applied. This prevents a bounty row's own status reset from advancing its timestamp and accidentally blocking the text clear.
- Notes that were genuinely edited at or after the reset boundary are still preserved during a delayed reset.
- Bounty-row status reset behavior remains unchanged.

## Retained from r16 and earlier releases

- Member-side saves affect only the authenticated member's own Tracker roster. Other members' legacy roster entries are preserved and cross-member edits remain rejected.
- All registered Member Roster characters are automatically included in Tracker. The one-time **Track all registered characters** recovery action remains available.
- Former-member Discord account-link archive/restore controls remain available.
- The r11-based Class / Job Catalog and r13 Dungeon Registration task-index repair remain included.
- Cloud task cells, weekly archives, completion-timing history, ownership records, and account links are not bulk-cleared or reset by this fix.

## Deployment

Deploy the complete package to the existing `dntrckr` Cloudflare Pages project using Wrangler or the project's existing Git deployment workflow. Do not use dashboard drag-and-drop for this Functions-based app. Keep the current D1 binding, Discord OAuth settings, secrets, and environment variables unchanged. Do not reset D1, run manual SQL, or clear browser storage. See `README_DEPLOYMENT.md`.

After deployment, confirm `https://dntrckr.pages.dev/version.json` reports `1.6.9-r17`. No one-time data migration is required for this weekly reset fix.

## Validation

- Reproduced the r16 logic defect for marked and completed bounty rows with previous-cycle notes.
- Regression-tested that previous-cycle notes clear when bounty-row status is also reset.
- Regression-tested that a note edited at/after the reset boundary is retained.
- Regression-tested that non-bounty weekly task states continue to reset as before.
- Node syntax checks passed for inline JavaScript in both HTML files and all Pages Function modules; ZIP integrity and root layout checks passed.
- Tests were run against local package code with mocked cell data. No live Cloudflare deployment or production D1 records were accessed.
