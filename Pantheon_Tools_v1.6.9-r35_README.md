# Pantheon Tools v1.6.9-r35 — Release Notes

## Guild Hub emblem blending

- Kept the exact uploaded Pantheon banner artwork and its right-aligned placement.
- Added a gradual left-to-right mask so the image emerges from the Guild Hub card surface rather than showing a visible rectangular edge.
- Added layered theme-token gradients and a restrained accent glow to blend the emblem into the full-width card.
- Added a slightly stronger blend on narrow screens to protect text readability.
- The blend adapts automatically to Dark, Light, Eye Comfort, and Pastel using the selected theme's existing surface and accent tokens.
- The local Card background selector and all other background choices remain unchanged.

## Preservation

- No changes to D1 schema, Pages Functions, authentication, synchronization, roster ownership, Team Builder data, or historical Tracker records.
- The uploaded `pantheon-guild-hub-banner.png` asset is unchanged.

## Validation

- Inline JavaScript syntax and HTML structure checks
- CSS parsing and r35 selector placement checks
- Version marker consistency
- Banner asset presence and checksum preservation
- ZIP archive integrity

A live browser visual test and production deployment were not performed in this environment.
