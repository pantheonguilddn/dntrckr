# Pantheon Tools v1.6.9-r30

## Changes

### Role Settings button contrast
- The Team Builder Role Settings button now uses the active theme's accent-soft background and primary text token, including hover and keyboard-focus states.
- Explicitly overrides the previous fixed white text rule that could blend into Light, Eye Comfort, and Pastel surfaces.

### Character Roster Analytics carousel
- Character-level 5-week completion trends and Personalized Task Priorities now sit in a wide horizontal carousel.
- Cards have a larger reading width, horizontal swipe/scroll, previous/next controls, keyboard arrow navigation, and a live character position counter.
- Cards remain readable without overlap and respect reduced-motion preferences.
- Existing analytics calculations and archive sources are unchanged.

### Team Builder image sharing
- Rebuilt the screenshot stage under the live Team Builder page so the page's real theme variables, CSS selectors, and responsive 4-Man / 8-Man grid apply to the capture.
- The share image now includes the format description, selected party layout, character/job/role details, and 8-Man Hardcore split DPS balance when applicable.
- Selected character/class values are rendered as static, theme-matched fields for reliable PNG capture.
- Removes only interactive controls from the image (share/clear buttons and slot-empty controls); visible party content and descriptions remain.
- Screenshot background follows the selected theme instead of a fixed dark background.

## Preserved
- No D1 schema or backend function changes.
- No authentication, sync, ownership, or tracker history changes.
- No browser storage clearing or migration.
- Team Builder remains local-save, with existing 4-Man and 8-Man parties unchanged.
