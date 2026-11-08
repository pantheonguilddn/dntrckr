# Pantheon Tools v1.6.9-r10

## Critical fix: Member Roster saves no longer wipe existing Tracker registrations

The r06-r09 client migration could queue every existing Member Directory entry as an `upsert`. The Worker treated those as intentional edits. Legacy or normalized character profiles may contain `trackerEnabled: false` even when that IGN was already in the committed Tracker roster. Rebuilding the roster from those flags could therefore unregister existing characters and deactivate their ownership-index rows in Universal View.

r10 changes the contract between the browser and Worker:

- The one-time migration queues `add` only for legacy Tracker owners that are genuinely missing from Member Directory. It no longer queues a bulk `upsert` for every existing member.
- The Worker ignores legacy r06-r09 `upsert` intents that lack the r10 opt-out metadata. They are treated as unsafe migration noise, not as intentional edits. This also makes previously queued r09 bulk-upsert operations harmless when they are retried after r10 is deployed.
- Current clients attach `trackerOptOutNames` and `characterRosterChanged` metadata to Member Directory operations. An empty opt-out list means preserve all prior Tracker opt-ins. Only names explicitly unchecked in a character-registration save may be unregistered.
- Metadata-only updates (roster color, class sync, and similar profile updates) preserve the server's committed character list, Tracker flags, Main designations, and character ordering. They cannot replace those fields using a stale browser snapshot.
- Existing characters are shown as Tracker-enabled in the edit UI whenever they are present in the committed Tracker roster, even when an older profile flag is absent or false.
- Character removal, individual Tracker opt-out, whole-roster opt-out, adding characters, and character-order edits remain explicit, member-scoped operations.
- Discord linking a member is separate from creating or changing their Tracker registration.

## Data and deployment safety

- No D1 schema change or migration is required.
- No task-cell, completion-timing, or weekly-progress rows are deleted or rewritten by this fix.
- Keep the existing `PANTHEON_DB` binding, D1 database, Discord OAuth secrets, and environment variables.
- Do not reset D1, clear browser/site storage, or run another Time Travel restore.
- Pending r06-r09 bulk `upsert` intents can be acknowledged as no-ops; make any still-needed character-registration changes again through the r10 Member Roster form after confirming the recovered roster is visible.

## Validation performed

- Worker regression tests run against the actual extracted Worker helper functions:
  - r09-style bulk legacy upserts plus a new member preserve every pre-existing Tracker roster.
  - metadata-only updates cannot replace a character roster from a stale/incomplete client snapshot.
  - explicit opt-out removes only the selected character.
  - explicit character removal affects only that member.
  - removing one member leaves all other member rosters intact.
- All Pages Function JavaScript modules passed `node --check`.
- All four inline JavaScript blocks in `index.html` passed `node --check`.
- The release marker and ZIP integrity are checked before packaging.

Live Cloudflare Pages deployment, D1 writes, Discord sessions, and multi-account synchronization have not been tested from this environment.
