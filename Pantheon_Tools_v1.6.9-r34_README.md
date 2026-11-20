# Pantheon Tools v1.6.9-r34 — Release Notes

## Uploaded Pantheon emblem banner

- Added the exact user-provided Pantheon banner image as the **Pantheon emblem** option for the Overview Guild Hub card.
- The emblem is placed as a decorative image layer behind the card text, aligned to the right so it complements rather than replaces the Guild Hub copy.
- Added theme-aware image treatments: original silver-on-charcoal for Dark, cool blue-slate for Light, warm stone/olive for Eye Comfort, and lavender-blue for Pastel.
- Retained the existing Wing facets, Aurora glow, Constellation, Flow lines, Orbit rings, and Minimal options.
- Made Pantheon emblem the default. Existing r33 users whose stored value is the former default `wing` are migrated to `pantheon`; explicit selections of other styles are preserved.
- The choice remains local to each browser and does not use D1 storage.
- Added `pantheon-guild-hub-banner.png` to the Pages root; it must deploy alongside `index.html`.

## Preservation

- No changes to D1 schema, backend functions, authentication, synchronization, roster ownership, Team Builder data, or historical Tracker records.

## Validation performed

- Inline JavaScript syntax checks
- CSS parsing checks
- HTML structural checks
- Version marker consistency
- User image asset presence and exact dimensions
- ZIP archive integrity

A live browser visual test and production deployment were not performed in this environment.
