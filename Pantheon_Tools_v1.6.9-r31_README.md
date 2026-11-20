# Pantheon Tools v1.6.9-r31

## Fixes

### Team Builder share image: main-character card outlines
- Main characters remain identified by the visible `★ Main` label in shared party images.
- The screenshot clone no longer carries the live editor's gold `is-main-character` border/shadow treatment. This avoids html2canvas rasterizing the outline as oversized strokes across neighboring text.
- Live Team Builder highlighting is unchanged; only the exported image clone is neutralized.

### Role Settings button contrast
- Added a dedicated ID to the Team Builder header's Role Settings button.
- Added the final CSS override after all legacy theme styles, using explicit high-contrast foreground/background pairs for Dark, Light, Eye Comfort, and Pastel.
- Applied matching theme-token contrast to the Save Role Settings button in the modal.

## Preserved
- No D1 schema, Pages Function, backend, authentication, OAuth, sync, roster, or Tracker-history changes.
- No browser storage clearing or migration.
- Team Builder remains local-save; 4-Man / 8-Man lineups and Split Party behavior are unchanged.
