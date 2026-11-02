# Pantheon Tools v1.6.8-r70

## Dungeon Registration category resolution

- Keeps the r69 per-character N/A-by-default behavior and Extra Dungeons opt-in calculation fix.
- The browser now sends the selected category's visible name and reset group as well as its ID.
- If an existing category ID is stale, the server resolves it by exact category name and group. If the match is ambiguous or absent, registration stops with a specific error instead of silently creating a duplicate or placing the dungeon in the wrong category.
- New-category creation and normal valid-ID registration are unchanged.

## Data safety

- No SQL/D1 schema migration is required.
- No tracker cells, member links, roster data, bounty notes, or task history are deleted or reset.
- The fallback is limited to the selected category identity and does not change category tasks on its own.

## Validation

- Inline JavaScript in index.html/admin.html and every Cloudflare Pages Function passed Node syntax checks.
- ZIP integrity and version marker consistency verified.
- Category-resolution tests cover: valid ID, stale ID with a unique exact name/group match, unique exact name with a legacy group mismatch, ambiguous same-name categories, and missing category.
- No live Cloudflare deployment or production D1 end-to-end test was performed.
