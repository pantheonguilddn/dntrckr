# Deploy Pantheon Tools r69

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r69.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and environment variables unchanged.
4. Do not run SQL, reset D1, clear browser storage, or remove the existing tracker record.
5. In Admin View, open Dungeon Registration. When adding a special/dated task, check **Exclude from calculations by default** before registering it.
6. Every character will see that task as muted N/A. The owner of a character can right-click that character's N/A cell to opt only that character into calculations. If a free Bounty Board line exists, Pantheon links it automatically; if none exists, the character-specific opt-in still works and the task appears directly in Share Bounties.
7. To opt out again, right-click that same character's marked cell. Only that character returns to N/A; other characters are unaffected.

The default-N/A setting is guild-wide; opt-in is per character. Daily/weekly resets return opted-in default-N/A tasks to N/A for the next period. The standard checkbox save queue and character ownership rules remain unchanged.

The What's New popup remains disabled.
