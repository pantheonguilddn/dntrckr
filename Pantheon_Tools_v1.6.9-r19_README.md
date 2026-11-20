# Pantheon Tools v1.6.9-r19 — Strict Mockup UI Match

## Design implementation
This release uses the approved clickable Pantheon mockup as the layout specification first, then maps only real application content into that shell.

- Full-width 72px topbar with Pantheon crest, sync status, personal/roster controls, segmented visual-direction selector, and signed-in account chip.
- Three-column desktop shell matching the mockup: 76px primary navigation rail, 258px Online Roster, and the remaining main workspace.
- Online Roster includes a live-presence search field and All / Online / Offline filters layered on the existing presence list. Selecting a person still calls the existing profile handler.
- Primary rail maps to real Overview, Tracker, Team Builder, Card Database, and Member Roster pages. Help continues to use the existing Help modal. Admin Tools remain available through the existing drawer from the rail when Admin Mode enables it.
- Overview follows the mockup page rhythm: page heading, guild-banner/profile hero, real shared-data/sync/permissions status cards, then Activity Insights and Character Completion panels. Duplicate destination cards are replaced by the navigation rail; Salary Calculator and Default Landing shortcuts remain in the profile quick-actions row.
- Mockup card/panel surfaces, spacing, typography, border treatments, and responsive behavior are applied to the existing pages.
- Added five visual choices: Guild, Aegis, Clean, Pastel, and Eye Comfort. Existing saved `dark`, `light`, `pastel`, and `eye-comfort` preferences retain their meaning; Aegis is an additive option.

## Adaptations where the mockup differs from the actual app
- The mockup's sample Daily / Weekly / Bounty tabs and sample activities are not copied. The production Tracker remains the actual category-driven table populated from Dungeon Registration, including its current category and bounty behavior.
- Sample names, fake counts, sample characters, and preview-only profile data from the mockup are not copied. The Online Roster continues to read live Discord presence and the actual member profile records.
- The mockup's Overview wording/cards are not substituted for real Overview widgets. Existing activity insights, personal character summary, widgets, analytics and page-specific controls remain.
- Existing utility/admin features not drawn in the mockup remain available from the real Tools drawer; no real feature has been deleted to force the sample UI.

## Explicitly unchanged
- No API handlers, Cloudflare Pages Functions, D1 schema or records, Discord OAuth, member ownership, Tracker sync, automatic character inclusion, weekly reset, bounty text reset, or task/completion history logic was changed.
- `admin.html`, `functions/`, `_headers`, `wrangler.toml` and D1 configuration are preserved byte-for-byte from r17.
- No migration, database reset, recovery action, or browser-storage clearing is required.

## Validation
- Confirmed build markers in `index.html` and `version.json`.
- HTML parsed; inline JavaScript syntax checked with Node.js.
- All Pages Function modules and admin page syntax checked.
- ZIP integrity checked and root-level deployment layout confirmed.
- Compared backend/function hashes against r17 source; unchanged.
- No live Cloudflare deployment or production D1 test was performed.

## Deployment
Deploy the extracted folder to the existing Pages project using the established Wrangler or connected Git workflow. Do not create a new Pages project, change the D1 binding, or reset the database. After deployment verify `/version.json` reports `1.6.9-r19`.
