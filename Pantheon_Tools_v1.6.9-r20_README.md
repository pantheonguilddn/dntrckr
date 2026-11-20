# Pantheon Tools v1.6.9-r20

This release replaces the previous partial UI interpretation with a faithful implementation of the approved clickable Pantheon mockup.

## UI changes
- Reproduces the reference three-column shell: 76px navigation rail, 258px Online Roster, and the remaining main workspace.
- Reproduces the reference topbar hierarchy, with the live database-status pill in the reference badge position, a Personal/roster view pill, segmented appearance switcher, and signed-in account chip.
- Keeps the primary navigation rail to the same five destinations plus Help; the existing admin-only Tools drawer remains accessible from the topbar rather than adding an extra rail icon.
- Rebuilds Overview in the reference order: page header, hero with weekly progress widget, four stat cards, and two-column Activity Insights / Character Completion panels.
- Applies the reference panel, card, typography, spacing, border, and button language to Tracker, Team Builder, Card Database, and Member Roster.
- Adds Pastel as a first-class segmented appearance choice; retains Guild, Aegis, Clean, and Eye Comfort.
- Existing presence data, profile selection, member actions, account controls, and tools drawer are reused. The mockup-only banner watermark and sample build label are not added.

## Content mapping (no invented tracker tabs)
- The mockup's demo task tabs, sample names, sample progress, and fake character list are not imported.
- Production Tracker remains based on the guild's actual configured Dungeon Registration categories and its existing bounty behavior.
- The mockup's four overview statistic positions are filled with live-derived data: personal tracked-character count, current online presence, weekly completion, and the six configured bounty-board slots.
- Existing Activity Insights and Character Completion remain the real application panels.
- Features not represented as primary mockup destinations remain in the existing Tools drawer / existing page controls rather than being deleted.

## Safety / compatibility
- No Pages Function, API, schema, D1, Discord OAuth, permission, synchronization, ownership, automatic Tracker inclusion, weekly reset, or bounty-reset logic was changed in this UI release.
- No database migration, manual SQL, D1 reset, browser storage clearing, or one-time recovery action is required.
- This package is not deployed to the production Cloudflare project.

## Validation
- HTML parser validation, inline JavaScript syntax checks, Pages Functions syntax checks, ZIP integrity, and required DOM structure checks passed.
