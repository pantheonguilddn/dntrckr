# Pantheon Tools v1.6.9-r36

## Guild Hub emblem blend and background selector placement

- The user-provided Pantheon Guild Hub banner is now rendered from a feathered-alpha derivative. The original uploaded PNG remains included unchanged.
- The left, top, bottom, and right image edges dissolve into the hero surface, avoiding a visible rectangular image boundary.
- The emblem image layer is sized to the right-hand image area instead of masking against the full card width.
- The theme-specific Dark, Light, Eye Comfort, and Pastel treatments remain active.
- The Card background selector has been moved into its own appearance row directly below the Guild Hub card. It no longer overlays or blocks the emblem or card text.
- All prior background styles remain selectable; the browser-local choice is preserved.

## Preservation

This release changes the Guild Hub decorative asset, its CSS presentation, selector placement, build markers, and release documentation only. It does not change the D1 schema, Pages Functions/backend, authentication, synchronization, or historical Tracker data.
