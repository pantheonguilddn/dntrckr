# Pantheon Tools v1.6.9-r01 — Stability and registration correction

## Fix for the Bounty-labeled dungeon registration error

- Fixed the false rejection that occurred when a real dungeon task name contained the word `Bounty`, for example `Desert Dragon Memoria [Bounty]`.
- The server now classifies a Bounty Board claim row by its registered category, matching the Tracker's existing `isBountyListTask()` behavior.
- A dungeon task registered under a normal dungeon category can be added to Admin Console #5 Extra Dungeons and default to muted N/A for every character.
- Actual rows registered in a Bounty-named category remain protected. The server still rejects attempts to apply default N/A exclusion to those claim rows.

## Tracker stability and responsiveness

- Tracker checkbox and bounty-note interactions use event delegation instead of per-cell/per-input event listeners.
- Tracker rows are assembled in a `DocumentFragment` and inserted in one operation to reduce repeated DOM insertion/layout work.
- Normal character-cell save debounce is 80 ms (previously 220 ms), preserving per-character batching, the durable local outbox, server acknowledgement, and retry/backoff behavior.
- Newer edits made while a character save is in flight are sent promptly after acknowledgement instead of waiting through transient-failure backoff.

## Preserved data and behavior

- Independent per-character D1 cell writes, character ownership checks, acknowledgement, conflict handling, and retry behavior.
- Console #5 Extra Dungeons default-N/A policy and per-character right-click opt-in.
- Bounty Board claim rows remain distinct and cannot be excluded by default.
- Existing features, categories, roster, Discord authentication, reports, admin settings, and stored character progress.
- Existing D1 schema and Cloudflare environment bindings. No migration or reset is required.

## Validation and deployment status

- JavaScript syntax, CSS parsing, package contents, release markers, and key policy invariants are checked locally.
- Regression checks cover `Desert Dragon Memoria [Bounty]` as a dungeon task and Bounty Board claim rows as protected claim entries.
- No live Cloudflare deployment, D1 write, browser benchmark, or multi-account end-to-end test was performed. This is a release candidate pending production verification, not a claim of production certification.
