# Pantheon Tools v1.6.9-r27

## Activity Insights carousel
- Replaces the crowded Activity Insights list with a dedicated, full-width carousel on Overview.
- The four live-data slides cover the top priority reminder, weekly pace, character follow-up, and recent weekly trend. No sample character names or placeholder percentages are used.
- Adds swipe/drag navigation, arrow controls, selectable progress dots, looping auto-rotation, and a pause/resume control. Auto-rotation pauses while the carousel is hovered, focused, the page is hidden, or the user has requested reduced motion.
- Moves Character Completion into its own full-width section directly below Activity Insights.
- Full descriptions are shown normally; Compact View switches to concise copy.

## Preservation
- Based on r26. Existing themes (Dark, Light, Eye Comfort, Pastel), history safeguards, five-snapshot retention cap, Tracker tabs, Guild Presence flyout, auth, ownership, sync, reset logic, D1 schema, and Pages Functions are preserved.
- No D1 migration, database reset, browser-storage clearing, or backend function changes.
- This is a source/package change only. It has not been deployed to Cloudflare.

## Validation
- JavaScript syntax, CSS parsing, archive integrity, and package structure checks are included in the release audit.
- Actual live production behavior still requires deployment and browser verification.
