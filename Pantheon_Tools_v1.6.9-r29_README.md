# Pantheon Tools v1.6.9-r29

## Fixes in this release

- **8-Man layout:** the single 8-Man party is divided into an upper group containing slots 1–4 and a lower group containing slots 5–8. On wide screens, each group is displayed as one row of four slots. Narrow screens reflow responsively while preserving the upper/lower grouping.
- **Split Party Mechanic restored:** the checkbox appears for 8-Man formats and is saved locally with Team Builder settings. When enabled, slots 1–4 and 5–8 are checked as separate four-player groups. Each group needs Heal, Tank / Provoke, and at least two DPS; 8-Man Hardcore also checks Debuff, Mobility, Beyond Time, and Highlander for each group. The 8-Man Hardcore balance panel shows Physical / Magical DPS for the upper group, lower group, and combined party. When disabled, the eight slots are evaluated as one combined party for Heal, Tank / Provoke, and four DPS.
- **Role Settings contrast:** the modal heading, explanatory note, table headers, job names, selectors, and checked / unchecked role labels use the active theme's foreground and surface colors for Dark, Light, Eye Comfort, and Pastel.
- **Roster Analytics restored:** per-character five-week completion trends and Personalized Task Priorities with their explanations are present as before. Only the redundant Character Activity Summary and deadline-strategy banner were removed from Tracker; the Overview Activity Insights carousel remains the quick summary.
- Updated the Roster Analytics help text to distinguish the Overview carousel from the detailed Tracker analytics.

## Data and compatibility

- Team Builder remains local-only: each browser stores one 4-Man party and one 8-Man party, with independent difficulty choices.
- Existing local Team 1 assignments continue to seed the new 4-Man and 8-Man layouts using the r28 migration: first four slots to 4-Man and all eight to 8-Man. The unused legacy Team 2 object remains preserved for backward compatibility but is not shown or used in the builder.
- Split Party Mechanic preference remains in the local Team Builder state; if absent, it defaults to enabled as before.
- No browser storage is cleared. No D1 schema, Cloudflare Pages Function, authentication, D1 binding, secret, member record, Tracker cell, or weekly archive is changed by this release.

## Validation performed

- JavaScript syntax checks for inline scripts and all Pages Functions.
- CSS parsing and HTML structure / duplicate-ID checks.
- Focused tests for 8-Man split vs combined validation, 8-Man Hardcore utility checks, 4-Man Hardcore baseline checks, and Physical / Magical balance by upper / lower group.
- ZIP integrity check.

The package was not deployed, and a full browser visual test was not available in this environment.
