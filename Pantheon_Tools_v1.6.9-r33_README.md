# Pantheon Tools v1.6.9-r33 — Release Notes

## Guild Hub background picker

- Added a **Card background** selector directly on the Overview's PANTHEON GUILD HUB card.
- Available styles: Wing facets, Aurora glow, Constellation, Flow lines, Orbit rings, and Minimal.
- The selected style is saved in this browser using local storage and restored on the next visit.
- Every decorative style uses the active theme's accent tokens, so changing between Dark, Light, Eye Comfort, and Pastel recolors the pattern automatically.
- The control is responsive and moves into the card flow on narrow screens.

## Preservation

- This is a front-end-only preference. It does not change D1, schema, authentication, sync, roster, Team Builder data, or Tracker history.
- Existing Roster Analytics, Activity Insights, and all r32 functionality are retained.

## Validation performed

- Inline JavaScript syntax checks
- CSS parsing checks
- HTML structural checks
- Version marker consistency
- Deployment archive integrity

A live browser visual test and production deployment were not performed in this environment.
