# Pantheon Tools v1.6.9-r23

## User-facing changes

- Removes the duplicate Activity Insights summary strip so the Overview's headline metrics are exactly: Registered Characters, Previous Completion Rate with week-over-week direction, Outlier Character, Most Completed Character, and Remaining Bounties Undone.
- Computes Previous Completion Rate from the latest saved weekly archive and compares it with the prior saved week when available. Characters with no eligible archived tasks are not incorrectly counted as 0%.
- Outlier Character is based on the lowest previous-week completion rate. Most Completed Character is based on the highest previous-week count of completed tasks (with percentage shown as supporting context).
- Keeps the full-page Guild Forum and Salary Calculator from r22, including their existing post, profile, calculation, and share-receipt interactions.
- Removes the top-left brand mark, widens the Personal / Universal View control and authenticated account identity area, and makes top-bar wrapping more deliberate at smaller widths.
- Standardizes the Weekly Tracker and Bounty Board tabs into equal-width controls with consistent heights, padding, and clearer labels. Dungeon category content and bounty screenshot visibility rules remain intact.
- Clean uses a subdued slate-light palette; Eye Comfort uses warm parchment and honey tones; Pastel uses a dreamy cotton-candy palette of lavender, pink, sky blue, mint, and soft gold.

## Preserved

- Existing Discord authentication and allowlist, Cloudflare Pages Functions, D1 binding and schema, data ownership, Member Roster, automatic Tracker inclusion, weekly reset logic, bounty note clearing, synchronization, task cells, saved weekly archives, and history.
- No D1 migrations or cleanup operations are included.

## Validation scope

The packaged HTML and JavaScript syntax, Pages Function syntax, release markers, key navigation/UI hooks, and ZIP integrity are checked locally. No production deployment or live D1 access is claimed.
