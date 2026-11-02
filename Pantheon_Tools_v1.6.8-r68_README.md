# Pantheon Tools v1.6.8-r68

## Default N/A / per-character computation and bounty opt-in

- Dungeon Registration includes an optional **Exclude from calculations by default** checkbox.
- The setting is stored in the shared Pantheon D1 record and preserved across compact transport, local/remote merges, and stale-client whole-record writes.
- Every character cell for a flagged task defaults to muted **N/A**. Existing untouched/open cells are treated as N/A; existing explicit `marked` and `done` states remain opted in.
- Right-clicking an N/A cell opts in only that character. The cell becomes **Marked** and is included in that character's completion calculation.
- An empty Bounty Board line is linked automatically when one is available, but a free line is not required for opt-in.
- Share Bounties also reads character-specific opt-ins directly, so the dungeon appears in the share builder even when no Bounty Board line could be linked.
- Other characters remain N/A and excluded. Removing the mark returns only that character's cell to N/A and clears any linked bounty-slot note.
- Completing/unchecking, daily/weekly resets, and weekly archive snapshots preserve the per-character opt-in rule. At reset, opted-in default-N/A tasks return to N/A for the new period.

## Data safety

- No character progress, member links, forum posts, profile banners, or task history is deleted.
- Existing D1 character-task cell states and the current checkbox save queue are unchanged.
- No SQL schema migration is required; the task policy is stored in the existing shared settings JSON and compact-record key mapping.
- The What's New popup remains disabled.

## Validation

- Inline JavaScript and all Cloudflare Functions syntax checked.
- Client and server compact-record mappings checked in both directions.
- Local/remote settings merge checked to retain the newest default-exclusion policy.
- Per-character default N/A, right-click opt-in, and independent character state exercised with a local cell-state harness.
- Share Bounties extraction checked both with and without an available Bounty Board slot.
- Weekly/daily reset and completion-rate inclusion/exclusion paths inspected and exercised with deterministic test cases.
- ZIP integrity and package file list verified.

No live Cloudflare/D1 deployment or production end-to-end verification was performed.
