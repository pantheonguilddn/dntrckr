# Pantheon Tools v1.6.8-r57

## Dungeon Registration and Extra Dungeons

- The Admin Console now lists every registered dungeon category, grouped as Weeklies or Dailies. This fixes the previous Weeklies-only filter that hid newly registered dungeons in Dailies categories.
- The Extra Dungeons list refreshes automatically while the Admin Console is visible, and refreshes again when the tab regains focus. Auto-refresh does not overwrite unsaved checkbox selections.
- Dungeon Registration now waits for a confirmed shared-settings save and reports clearly when the server has not confirmed the registration.
- Extra Dungeons selections remain server-held. Dailies already sit outside weekly completion-rate math; tagging them does not change weekly percentages. Weekly tasks tagged as Extra Dungeons remain visible/checkable but are excluded from weekly completion calculations.

## Tracker table sizing

- The task-name column now sizes itself to the longest registered dungeon label (within a readable cap). Names wrap instead of being clipped with an ellipses. The table can scroll horizontally when the roster is wide.

## Guild member sidebar

- The online/offline list is now a full-height Discord-style left rail on desktop, with its own vertical scroll area. The main app content receives a matching left gutter.
- On narrower screens, the member list moves above the content as a compact in-flow section so it does not consume the workspace width.
- The collapse control reduces the desktop rail to a narrow strip and restores workspace width.

## Preserved behavior

- The What's New release popup remains disabled.
- Per-character checkbox storage, pending save queues, retry/acknowledgement behavior, Discord authentication, member links, and the D1 schema are unchanged.
- No database migration or reset is required.

## Deployment

Upload the complete ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` paths and existing D1 binding. Do not clear browser data, delete records, or run SQL.

## Validation

Validation performed: index and admin inline JavaScript syntax checks passed; duplicate HTML IDs were not found; all inline CSS blocks parsed without errors; an API smoke test confirmed that both Weeklies and Dailies are listed, Bounty Board tasks are excluded, and selections save correctly. The package diff confirms the per-character storage and checkbox-save endpoints are unchanged. ZIP integrity was checked. No live Cloudflare/D1 production test or full interactive browser test was performed.
