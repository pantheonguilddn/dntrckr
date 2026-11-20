# Pantheon Tools v1.6.9-r26

## Requested UI changes
- Renamed the Guild theme label to **Dark** and Clean to **Light** in both sign-in and in-app theme pickers.
- Reworked Light into a soft, blue/periwinkle palette with muted, non-white surfaces.
- Reworked Eye Comfort into a lower-glare sage/stone palette with subdued surfaces and text contrast.
- Restored full Activity Insights recommendation descriptions in normal view. Compact View now swaps in separate concise next-action copy only while Compact View is active.
- Expanded Activity Insights spacing, text sizing, and panel layout to reduce crowding.
- Removed the redundant **Open Tracker** button; the Tracker remains accessible from the navigation rail.
- Removed the extended-analytics opt-in checkbox and the Clear Stored History button/function. Existing timing-collection preference is preserved. Weekly completion history now retains up to five snapshots regardless of that legacy preference.

## Preservation
- Based on r25. Existing weekly archive contents, timing records, task cells, roster data, authentication, ownership, synchronization, reset logic, D1 schema, and all Pages Functions are preserved. No migration, database reset, or browser-storage clearing is required.
- This is a source/package change only. It has not been deployed to Cloudflare or visually verified against the live production site.

## Deployment
Deploy to the existing Pages project `dntrckr` using `README_DEPLOYMENT.md`. Verify `/version.json` reports `1.6.9-r26`.
