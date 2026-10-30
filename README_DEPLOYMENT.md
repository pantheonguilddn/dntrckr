# v1.6.8-r29 – Wait for initial shared-data hydration

- Fixed startup sequencing: `forceSync()` now returns its actual asynchronous sync promise, so `loadLiveTracker()` genuinely waits for the cloud read/merge/write cycle instead of awaiting an undefined return value.
- After the initial sync attempt completes, the app refreshes the UI from the final merged state before routing finishes. This prevents a stale locally cached checkbox from appearing unchecked on the first Tracker visit and then changing to checked only after navigating away and back.
- The existing local pending-cell queue, conflict handling, member-safe writes, and retry behavior are retained. Normal cloud latency still exists; the UI now waits for initial hydration rather than presenting stale progress as if it were authoritative.
- Built directly from v1.6.8-r28. No data schema or API changes. Production Cloudflare Pages/D1/Discord multi-user verification remains outstanding.

## Validation

- JavaScript syntax checks passed for all inline application scripts.
- Static startup-order checks confirm `loadLiveTracker()` awaits a returned `forceSync()` promise and performs a post-hydration UI refresh.
- Existing pending-write persistence and compare/write verification code remains intact.
- ZIP integrity and original package-path preservation passed.

---

## v1.6.8-r28 – Task-specific reset/service warnings

- Removed paid-service instructions from the global urgency banner and reset-phase strategy. The banner now gives generally useful timing advice without assuming a player has a serviceable unfinished dungeon.
- Service/carry recommendations remain tied to the selected activity and its Activity Reference `serviceable` field; activities marked `No` do not inherit generic service advice from built-in fallbacks.
- Updated the Overview's no-open-tasks message to avoid recommending services when there are no unfinished weekly tasks.
- Kept the existing serviceable-activity Last Call checks and urgency ranking; the change is about contextual messaging, not weakening or removing task-specific service recommendations.
- Built directly from v1.6.8-r27. No data schema or API changes. Local syntax/targeted logic tests passed; production deployment and live Cloudflare/D1/Discord integration remain untested.

# Pantheon Tools v1.6.8-r25 — Earlier Last Call and service-window planning

This release continues directly from v1.6.8-r24. It retains the adaptive urgency scorer, shared D1 persistence fixes, Activity Reference editor, bounty logic, and raid role-fit recommendations.

## v1.6.8-r25 reset phase adjustments

- Last Call now begins 24 hours before Saturday 9:00 AM Manila reset. The preceding 24-hour phases shift earlier: Final Push is 24–48 hours, Deadline Push is 48–72 hours, Raid Window is 72–96 hours, Focus is 96–120 hours, Build Momentum is 120–144 hours, and Plan Ahead is more than 144 hours from reset. Reset Imminent remains the final two hours.
- Overview and Tracker banners, task-ranking adjustments, completion badges, reminder timing, BDN/DDN hints, and serviceable-activity recommendations use the same updated phase boundaries.
- Serviceable activities receive a modest scheduling/feasibility lift earlier in the week, with stronger guidance to arrange a paid service during the Raid Window, Deadline Push, or Final Push. During the final 24 hours, the model no longer assumes a booster is available: serviceability no longer boosts ranking, and an unproven service-dependent group goal is downgraded similarly to other unproven group runs unless the character has a prior clear. Last Call guidance says to rely on a service only after a provider confirms availability.
- The activity-planning tips for Abyssal Mire and Dragon Fellowship now change with the countdown rather than unconditionally suggesting a service. Generic built-in service prompts are removed from the default Last Call recommendation when a time-sensitive warning is shown; unrelated/custom Admin guidance is preserved.
- Overview starts actionable reminders at 72 hours, when Deadline Push begins, rather than waiting until the final 48 hours. The countdown still updates every minute.
- No database migration or new API route. Only `index.html` and this deployment README are changed from r24; the package preserves all 32 original entries and paths.

## Validation

- JavaScript syntax checks passed for all inline app scripts.
- CSS parsing and duplicate HTML ID checks passed.
- Targeted phase-boundary tests passed at 144, 120, 96, 72, 48, 24, 8, and 2 hours.
- Scoring tests confirm serviceable activities get their convenience lift before the final 24 hours but do not receive a serviceability boost during Last Call; unproven service-dependent objectives fall behind more reliable options, while prior clears remain recognized.
- ZIP integrity and exact package-path preservation passed. Live Cloudflare Pages, D1, and Discord-session end-to-end behavior still requires post-deployment verification.

---

# Pantheon Tools v1.6.8-r24 — Reset urgency and adaptive task triage

This release continues directly from v1.6.8-r23. It retains the shared D1 persistence fix, Activity Reference editor, bounty behavior, and personalized raid-role rules.

## v1.6.8-r24 reset urgency and time-aware recommendations

- Replaces passive “Final 2 days” labeling with a visible reset strategy banner in Overview Activity Insights and the Tracker's lower Activity Insights panel. It displays an exact countdown to Saturday 9:00 AM Manila reset and adjusts its advice through Plan Ahead, Build Momentum, Focus, Raid Window, Deadline Push, Final Push, Last Call, and Reset Imminent phases.
- Adds time remaining to the shared Overview/Tracker recommendation scorer. During the Thursday-style deadline push (48–24 hours left), valuable party-dependent runs get a nudge while there is still time to organize a group. In the final day, unproven, non-serviceable group runs fall behind realistic alternatives; in the last eight hours, short clears with prior completion evidence rise further. Serviceable objectives such as Abyssal Mire and Dragon Fellowship retain their fallback advantage.
- DDN HC keeps its salary-run value and is favored during the group-planning window. It is gradually outranked by more reliable clears late in the week when there is no recorded clear and no service path; that is a feasibility adjustment, not a claim the reward stopped being valuable. BDN remains conditional on relevant character history/role and group readiness, and is progressively downranked late if no clear is recorded.
- Ensures Overview highlights every tracked character with remaining tasks during the last 48 hours instead of only displaying reminders for low completion percentages. The reminders show the top time-aware next action, progress, and remaining task count.
- Removes the Tracker analytics filter that required a task to have been marked incomplete in archived weeks before it could ever be recommended. The Tracker now ranks current open weekly tasks even when a character has little or no saved history; old history improves ranking but is not required for advice.
- The activity reference runtime parser now correctly reads floor-based times such as Abyssal Mire's 2F + 5F estimate, while keeping parenthetical service-time alternatives from inflating a normal run estimate.
- Re-evaluates the displayed countdown every minute and refreshes the recommendation panel when the urgency phase changes, so the strategy evolves even if a player leaves the app open.
- Uses the same scorer in Overview and Tracker. Shared Loot Weight is not changed. Bounty tasks are excluded from the weekly recommendation list, and the weekly reset remains Saturday at 9:00 AM Manila time.

## Validation

- JavaScript syntax checks passed for all inline application script blocks.
- CSS parsing and duplicate HTML ID checks passed.
- Targeted reset-phase, time-parser, and activity adjustment tests passed for DDN HC, BDN, Theme Park, Dragon Fellowship, and Abyssal Mire across early deadline, final-day, and last-call windows.
- Package integrity and exact path preservation passed. Built from the actual r23 Cloudflare Pages ZIP; only `index.html` and this README change within the archive.
- Live Cloudflare Pages, D1, and Discord-session integration has not been tested in this environment and must be checked after deployment.

---

# Pantheon Tools v1.6.8-r23 — Cloudflare Pages + D1

This release continues directly from v1.6.8-r22 and addresses Tracker checkmarks that appear to save but revert after a refresh.

## v1.6.8-r23 tracker persistence reliability

- Adds a durable local pending-write queue for task cell state and bounty-note changes. A refresh before the normal autosync finishes no longer drops the explicit edit; the next authenticated sync reapplies it against the latest shared cell record.
- The save flow now clears a queued edit only after the shared record confirms the requested state/note. If a conflicting newer save wins, the UI refreshes from the shared record and displays a warning instead of claiming that the checkmark was saved.
- The D1 tracker write endpoint merges individual cell records by their update timestamps and device tie-break before authorization checks, so an old browser snapshot cannot replace a newer task state simply because it writes the full tracker record.
- Main-record writes now use compare-and-swap updates with bounded retries. Concurrent clients cannot silently overwrite one another between the read and write; repeatedly contended saves return an explicit retry error.
- No D1 schema migration or new route. Bounty logic, roster ownership/access control, Activity Insights, role-fit logic, and shared Activity Reference are retained.
- Built directly from r22. The package retains all 32 archive entries/paths; only `index.html`, `functions/api/cloud/b/[id].js`, and this README change. Validation includes inline JavaScript syntax, endpoint syntax, concurrent-write / stale-cell merge tests, pending-write queue tests, CSS parsing, and ZIP integrity. Live Cloudflare Pages, D1 and Discord-session end-to-end tests are not available in this build environment and must still be confirmed after deployment.

---

# Pantheon Tools v1.6.8-r22 — Cloudflare Pages + D1

This release continues directly from v1.6.8-r21. It preserves the bounty fixes, activity reference, adaptive scoring, admin editor, and shared data model.

## v1.6.8-r22 BDN role-fit recommendations

- Fixes the Moonlord/utility-alt failure mode: a class role tag such as Highlander no longer makes BDN a recommended next task by itself, nor is the character framed as unsuitable simply because the current Tracker history is not strong yet.
- Black Dragon is now recommended for the Main by default, or for a secondary that has a prior BDN clear. An unproven secondary is not presented as a next step because the app cannot see whether a geared party needs its role or has enough damage to carry the run; this is a recommendation gate, not a claim the character cannot participate.
- A secondary without a prior BDN clear can qualify when it has configured raid contribution plus sustained Tracker activity and strong completion performance. It then receives a role-weighted priority bonus and contribution multiplier.
- Adds an initial editable-metadata-driven contribution hierarchy: Tank/Provoke and survival roles first; Debuff/Mobility next; Heal is useful but MATK-sensitive; Highlander/Beyond Time and other Utility/Support are situational group-fit roles; pure DPS requires stronger BDN readiness evidence or a specific geared-party invitation. Admin/Role Settings remains the source of each job's role metadata.
- Moonlord is classified as a Highlander utility/DPS hybrid. A high-activity, high-performing Moonlord alt can be recommended for a geared BDN group when Highlander is needed; without that evidence, BDN is not pushed as its next task. Strong role history improves the case but never guarantees a clear.
- Keeps Overview and Tracker on the same personalized scorer. Shared Loot Weight, activity value, N/A handling, DDN HC's salary-run priority, bounty behavior, Activity Reference, API routes, and data schema remain unchanged.
- Built directly from r21; only `index.html` and this README change within the ZIP. All 32 package paths are preserved. JavaScript syntax, CSS parsing, recommendation/role-fit tests, starter JSON parsing, and ZIP integrity are checked. Live Cloudflare Pages, D1, and Discord-session end-to-end tests are not performed.

---

## v1.6.8-r21 balanced DDN HC recommendation

- Replaces the overly terse r20 wording with a short value-first explanation: DDN HC remains worth prioritizing at the Level 70 cap because the Evolution Hammer and Lv 60 Legend Codes support gear progression, with a chance at a Legendary DDN accessory; it ends with a practical 8-player group recommendation.
- Keeps the 27-minute run estimate in optional supporting detail rather than the lead, so risk informs planning without undercutting the activity's value.
- Updates the built-in activity profile, Admin Console starter data, and downloadable Activity Reference JSON. Previously saved r19/r20 wording is normalized on read, while future custom administrator-authored guidance is preserved.
- Built directly from v1.6.8-r20. Only `index.html`, `admin.html`, and this deployment README change within the ZIP; all 32 original archive entries and paths are preserved. No schema or API behavior changes. JavaScript syntax, CSS parsing, duplicate-ID checks, focused recommendation behavior, JSON parsing, and ZIP integrity are checked. Live Cloudflare Pages, D1, and Discord-session end-to-end tests are not performed.

---

## v1.6.8-r19 activity-value and raid-fit reasoning

- Reframes DDN HC as a high-value weekly salary run for the Level 70 cap: it is Level 60 content with progression drops and a chance at a Legendary DDN accessory. Its possible failure is handled as a scheduling/time-budget issue, not as a reason to demote or skip the run.
- Explicitly classifies DDN HC as medium-tier/legacy content for character-feasibility scoring, while retaining a separate salary-run priority bonus. This strategic bonus is added to personalized priority without changing the shared Loot Weight. It gives DDN a useful baseline before a character has accumulated archived history.
- Removes the old DDN guidance that discouraged planning around the clear. Existing saved D1 references using that older sentence are normalized at read time; the Admin Console starter list is also updated so the corrected advice can be saved for future data edits.
- Makes BDN recommendations group-sensitive. The Main is guided toward a geared party or guild run, with a 50+ minute budget and BDN-specific readiness evidence. A non-Main utility/support character can receive a positive fit adjustment when its recent Tracker history shows sustained activity and solid completion performance; the advice still requires that a geared party actually needs that role.
- Preserves the serviceability source of truth. DDN HC and BDN are marked not serviceable in the provided Activity Reference, so their guidance does not suggest a paid service as the default fix. A role-fit guild party is distinct from a paid carry.
- Keeps Overview and Tracker on the same task scoring function. High-value targets, readiness fit, and time-management advice are treated separately: uncertainty or elapsed run time should inform planning, not automatically erase reward value.
- No schema migration or new API route. The package preserves the exact r18 ZIP entry list; modified package files are `index.html`, `admin.html`, and this README. The starter JSON is also available separately for admin import/backup.
- Validation: JavaScript syntax and CSS parse checks, focused policy tests for DDN/BDN scoring and language, starter data checks, and ZIP integrity/path-preservation checks. Live Cloudflare Pages, D1, and Discord-session end-to-end testing was not performed.



## v1.6.8-r18 admin-managed Activity Reference

- Adds an administrator-only **Activity Reference & Recommendation Data** section to `admin.html`. The starter list contains the 13 activities and details supplied by the guild: entries, milestone goal, party size, average run time, serviceability, materials/drops, weekly rewards and concise practical guidance.
- Activity profiles can be edited, added or removed, reloaded from shared D1, and imported/exported as JSON for future bulk updates. Edits are not published until **Save Activity Reference** is pressed.
- Adds the admin-only `GET/PUT /api/admin/activity-reference` endpoint. It writes the activity profiles and update metadata to the shared `pantheon-main` record in D1 and records the action in `audit_events`. No SQL schema migration is required.
- The app now preserves activity profiles in `normalizeData` and during local/remote merges. Activity Insights uses the saved profile to display the configured recommendation, party size, run time, serviceability, milestone goal, weekly rewards and materials. Confirmed serviceability changes the carry/service feasibility signal; expected run time provides a modest efficiency adjustment relative to a 15-minute baseline, capped at -10% to +5%. This does not change shared Loot Weight or infer a numeric gold value for materials/rewards.
- Fixes demand classification for Black Dragon Memoria I–III so the 4-player Memoria entries are treated as medium-tier activity rather than inheriting the generic Black Dragon endgame classification.
- Existing bounty-mark behavior and plain-language recommendation changes from r14–r17 are retained.
- Built from the verified r17 ZIP. This package includes every original package path plus the new admin API route. JavaScript syntax, CSS parsing, endpoint syntax, starter-profile content, profile normalization/merge, and ZIP integrity are checked. Live Cloudflare Pages, D1 and Discord-session testing was not performed; deploy and end-to-end test before treating production behavior as verified.

## v1.6.8-r17 action-first personalized recommendations

- Removes generic rotation/priority filler such as “Keep this character in the rotation if it is still a priority.” Overview now names a specific unfinished task and gives a short, practical reason for doing it.
- Overview and the Tracker's Personalized Task Priorities now use the same shared scoring function. Next-task selection incorporates shared Loot Weight, archived task outcomes, the character-specific fit adjustment, activity value/effort profiles, and reset-sensitive value where configured.
- The Overview's Priority Reminders and Character Completion both surface the recommended task and its concise reason. The reminder's urgency still increases gradually as Saturday reset approaches; it does not invent urgency early in the week.
- Plain-language task guidance is more action-oriented: Theme Park route choice; Abyssal Mire 2F + 5F with one key remaining for the 5,000-point weekly total; Dragon Fellowship weekly Heraldry with service as an option when duoing is impractical; and the practical reward/cost guidance for configured raids.
- Meaningful completion trends remain visible, while empty placeholders about unavailable trends are removed. Deeper history/score details remain optional in Tracker Analytics.
- Shared Loot Weight values, the scoring formula, weekly archives, bounty behavior, access controls, D1 schema, and API remain unchanged. The scoring formula is now defined once and used by both Overview and Tracker to prevent drift.
- Built directly from the v1.6.8-r16 ZIP package. The archive preserves its exact 31 entries and paths; only `index.html` and this deployment README are changed. JavaScript syntax, CSS parsing, HTML ID uniqueness, scoring/reason behavior checks, and ZIP integrity pass. Live Cloudflare Pages, D1, and Discord-session end-to-end tests were not performed.

## v1.6.8-r16 plain-language Activity Insights

- Simplifies Overview reminders to one clear next action, a short reason, and a compact completion status. The existing gradual urgency increase toward the Saturday reset remains in place.
- Simplifies personalized task recommendations in the lower Analytics area. Each card leads with one practical sentence. **Why suggested?** opens a brief history note and an activity-specific tip; saved result counts, character-fit detail, and score explanation are nested under **Past results and score (optional)**.
- Replaces self-explaining caveats with actionable activity advice: Theme Park recommends Persian Goblin for players with auto-attacking units who want to idle, or Treacherous Path for fast clears; any Theme Park activity counts. Abyssal Mire recommends 2F + 5F with 1 key remaining for the 5,000-point weekly total after reset, and notes that a service may be worthwhile. Dragon Fellowship is presented as a weekly Heraldry reward, with a service as an option when duoing is impractical.
- Shortens the Help Guide’s analytics explanation and replaces technical terms in prominent UI copy where simpler wording is clearer.
- Keeps the underlying recommendation formula, shared Loot Weight values, character-fit logic, confidence thresholds, weekly archive structure, bounty behavior, permissions, schema, and API unchanged.
- Preserves all 31 entries and paths from the r15 ZIP. JavaScript syntax, CSS parsing, duplicate HTML IDs, and focused wording checks pass. Live Cloudflare Pages, D1, and Discord-session end-to-end tests were not performed.

## Historical: v1.6.8-r15 explainable Activity Insights

- Each personalized task recommendation now has an expandable **Why this ranking?** explanation showing the per-character fit rationale, configured activity reward/effort profile, archived outcomes, and score components that produced its P priority.
- Adds Low / Moderate / High evidence confidence based on the count of non-N/A archived observations for that activity: under two usable observations is Low, two to three is Moderate, and four or more is High. This measures available history, not a probability of success or a promise that the character can clear the activity.
- Explicitly separates clear history, not-completed weekly records, and N/A exclusions. N/A records are not treated as failed attempts and are excluded from capability-evidence confidence.
- Clarifies that shared Loot Weight L remains fixed; P is the personalized priority score. The UI surfaces the score breakdown without changing the underlying recommendation formula, character-fit modifiers, activity profiles, weekly archive structure, or permissions.
- The explanation explicitly notes what the system cannot read: current gear, shop balances, Jelly inventory, market prices, and availability of carries/services. It does not convert a missing clear into proof of inability.
- No database migration, schema, API, or permission changes. Built directly from v1.6.8-r14 with the existing 31 ZIP entries and paths preserved. Live Cloudflare Pages, D1, and Discord-session end-to-end tests were not performed.

## Historical: v1.6.8-r14 bounty mark behavior

- Reset Bounty (🔄) is now available only on rows in the Bounty category. Dungeon rows cycle Open/Done → Marked → N/A → Open and no longer display the Reset state; legacy Reset states on dungeon rows are visually treated as Open.
- Marking a dungeon fills the first truly available bounty line only: the line must be Open and have no target text. Marked, Reset, N/A, completed, or manually populated lines are skipped, so a Reset Bounty line reserves its slot and new targets move to the next available line.
- Removing a dungeon's bounty mark clears the matching bounty target textbox. Removing the Marked or Reset status from a bounty-list row clears that row's textbox. Reset rows stay reserved until cycled through N/A and Open.
- Completing a marked dungeon completes only the matching linked bounty line; the old fallback that could complete an unrelated unfinished bounty slot has been removed.
- Updates the Tracker & Bounty help text and context tooltips. No schema or API changes. This release is built directly from the v1.6.8-r13 package, with the existing 31 package entries preserved. Live Cloudflare Pages, D1, and Discord-session end-to-end tests were not performed.

## Historical: v1.6.8-r13 Tracker class labels

- Each Tracker character column now shows the IGN on the first line and the configured Job in parentheses on a smaller, centered second line (for example, `Diabolina` / `(Saleana)`).
- Main-character star remains beside the IGN rather than after the full two-line header.
- The class uses the existing character job in Member Roster/Character Jobs. If no job is configured, the header says `(Class not set)` instead of inventing a class.
- Uses theme-aware inherited text color and the existing header background; main font sizes and task cells are unchanged. No schema or API changes.

## v1.6.8-r12 activity reward/effort profiles

- Keeps global Loot Weights unchanged. The separate personalized `P` recommendation score combines the shared `L` weight with activity-specific reward utility, effort/resource cost, accessibility, weekly-objective value, and per-character history.
- Adds a flexible progression profile for Abyssal Mire: the stated 2F + 5F route yields 2,000 points with a further 3,000-point Saturday reset payout (5,000 total); known shop uses include Essence of Life (240), Polished Diamond (300), Flawless Diamond (300), Crystal of Power (30), Job Change Scroll (18,000), cosmetics/mounts, and Paculta suffix materials.
- Adds a weekly-objective profile for Green Dragon Classic, centered on Essence of Life and Polished Diamond, and a cost-sensitive Green Dragon Hardcore profile that weighs the 36g final chest, useful High Grade Legend Codes, and L Accessories against seal-stamp cost.
- Adds separate value profiles for DDN HC carry/service potential, Black Dragon Level 70 endgame, weekly Dragon Fellowship Heraldry pouch progression, and Theme Park efficiency from the once-weekly x5 Jelly opportunity. The model does not assume Jelly is available for every run.
- Corrects content tiers so a task labelled Classic is not automatically treated as high difficulty. Successful clears are evaluated for that exact activity; absence of a clear does not automatically mean the character cannot clear it.
- Reduces unproven-clear penalties for activities known to be carryable, and removes the automatic stronger penalty based only on a configured DPS role. The learning model still uses saved outcomes and N/A history, and becomes more reliable with several archived weeks.
- Adds compact value notes to Analytics recommendations and a planning hint for the once-weekly x5 Jelly opportunity. Dragon Fellowship is treated as a weekly Heraldry activity. The tool does not read gear, shop balances, Jelly stock, current market prices, or whether a carry is currently available; profiles are starting estimates rather than live inventory valuation.
- No data schema, API, or permission changes. The existing 31 package entries and paths are preserved. Live Cloudflare Pages, D1, and Discord-session end-to-end tests were not performed.

## Historical: v1.6.8-r11 personalized task recommendation layer

- Keeps global Loot Weights fixed and shared. The existing weight values are unchanged; the character-specific `P` score is calculated after the global loot-weighted task score.
- Adds a separate character/task fit modifier based on archived per-task outcomes, recent clears, current-week state, N/A history, and evidence that the character has completed other tasks.
- A recent clear modestly strengthens recommendations for content the character has demonstrated it can complete. Proven recurring activity on accessible tasks (for example, farming tasks such as Abyssal Mire) receives a smaller fit bonus.
- For a non-Main character, repeated archived misses on high-demand tasks with no recorded clear can lower that task's recommendation when other-task completions demonstrate the character was active. DPS-role characters receive a stronger provisional reduction after at least three archived observations. This is only a heuristic about demonstrated activity; it does not claim the character is undergeared or incapable.
- Main characters receive a modest nudge toward high-demand content. The tool does not treat missing clear history alone as proof of inability. Tasks currently marked done or N/A are not shown as next actions.
- Adds a compact explanation of `L` (global Loot Weight) and `P` (personalized priority score), and revises the Analytics help text to explain the distinction.
- No schema, API, permissions, or cloud-record structure changes. Existing weekly archives are reused; weekly analytics must be enabled and several saved weeks help the model make stronger distinctions.


## v1.6.8-r10 theme text contrast fix

- Fixed non-Main character names in the 5-Week Trend cards: every IGN now uses the selected theme's foreground color instead of the legacy hard-coded white. This applies to Dark, Light, Eye Comfort, and Pastel and does not change font sizes or card layout.
- Fixed the Admin Console's Revoke button so its red fill always has white, readable text in all themes.
- No data schema, API, permission, or cloud-record changes.

## v1.6.8-r9 responsive layout and weekly pacing update

- Prevented the top toolbar from exceeding its container because of width-plus-padding calculations.
- Kept the main tool centered. The Online/Offline roster floats beside it only when there is enough outer gutter; on regular desktop/laptop widths it moves into normal flow rather than covering the application.
- Added earlier responsive breakpoints for browser windows reduced by Windows display scaling or browser zoom. Dense overview panels and Team Builder content stack before their columns become cramped; Card Database controls and cards adapt to the available width.
- Added adaptive spacing at scaled laptop widths without enlarging the original text scale.
- Made Overview Analytics time-aware: the first 48 hours after the Saturday 09:00 Manila reset are treated as early week, with no low-completion reminders. Reminders grow more direct through the week, and “Low completion” appears only near the final day when the recorded rate remains low.
- Character Completion prioritizes Main/recorded activity early in the week, then switches to pace checks and lowest completion as reset approaches. Weekly completion summaries show the current week phase.
- Kept tables within their own horizontal scroll containers. No schema, API, permission, or database changes.

## v1.6.8-r5 update

- Expanded the left-side Online/Offline roster to 330px on desktop, stacked the Online and Offline groups for legibility, and allowed long names to wrap rather than clip. Narrow screens keep the roster in normal page flow.
- The Rate-Up notice is shown only while at least one configured event is active. It displays the remaining time for +50% Item Drop and/or +30% Enhancement, updates every 30 seconds, and disappears when no event is active.
- Audited all five main pages and the app's dialogs across Dark, Light, Eye Comfort, and Pastel, with representative Card Database results, Member Roster/Main badges, and Team Builder status content. Corrected the Team Builder alert badge, Card Batch modal labels, Salary Calculator result colors, and Ledger surfaces/buttons that still relied on dark-theme text colors.
- Reverted the recent event-banner text-size increase; font scale is otherwise unchanged. Readability fixes use appropriate foreground/background pairs, not larger typography.
- Updated the release title and dismissal version so the compact What's New popup identifies v1.6.8-r5.
- Applied the same theme contrast safeguard to the Admin Console's return link. No data schema change is required.

## Deployment notes

Deploy the ZIP as a unit so `index.html`, `admin.html`, and the authenticated `/api/presence` endpoint stay in sync. The presence roster uses approved accounts and the existing session/D1 setup. No database migration is needed. Administrator-only tools remain protected by the existing server-side role checks; this release does not grant or alter account permissions.

The standalone HTML is useful for inspection, but presence and cloud-backed features require the Cloudflare Pages deployment and its authenticated API. Live Cloudflare/D1/Discord end-to-end tests were not performed as part of this build.

---

## v1.6.3 Version History theme contrast

- Fixed revision names, revision metadata, R-number labels, empty-state text, notes, and status text that were using hard-coded light colors and becoming unreadable on Pastel, Eye comfort, and Light backgrounds.
- Updated SAVEPOINT, GLOBAL CHANGE, and EXTERNAL CHANGE badges to use a solid high-contrast fill with white text.
- Applied theme-aware surface and border colors to revision detail cards, with separate readable colors for added and removed values.
- Updated the release indicator and internal app version to v1.6.3.

This release is based on v1.6.1 and extends the inline character-registration editor so members can add characters directly from the confirmation prompt or Tracker. Saving updates the canonical shared Member Roster and reprojects the Tracker roster. Character registration uses the authenticated shared-storage endpoint and queues a cloud sync after Save; check the app sync status and retry if the remote write fails.

Deployment details retained from the v1.6.8 baseline: this package uses Cloudflare Pages + D1. Discord display names map to Member Roster owner names; when they differ, set the roster-match name in the admin allowlist. A Wrangler configuration file is not required. Bind D1 through the Cloudflare Pages dashboard.

## v1.6.2 add characters in the shared editor

- Added a **＋ Add Character** action directly below the character list in the confirmation/editor popup. It appends a new editable entry with IGN, Class / Job, Main selection, Track this character opt-in, and up/down ordering.
- Newly added entries can be removed from the draft before saving. A blank unsaved entry or duplicate IGN prevents save until corrected. The editor has a Cancel action when opened from Tracker, while first-time confirmation remains required.
- Tracker **＋ Add More Characters** and empty-state **＋ Add Characters** now open the same character editor popup instead of navigating to Member Roster.
- Saving updates the member's ordered character list, class mapping, Main designation, and tracking opt-ins in the shared Member Roster; Tracker rosters are rebuilt from that canonical data and cloud sync is queued immediately after the save is accepted.
- Supports first-time users without an existing Member Roster entry by creating the authenticated member entry on Save, provided their Discord identity maps to a unique owner name. Duplicate/conflicting identities are blocked and referred to an administrator.

## v1.6.1 Personal Tracker default and onboarding follow-up

- Tracker now opens in Personal View whenever the signed-in member navigates to it, including from the side drawer, Overview shortcut, route links, and saved landing preferences. Legacy `tracker-universal` startup settings are treated as Personal View; Universal View is still available through the in-Tracker toggle.
- The personal roster dropdown is disabled while Personal View is active, and reflects the authenticated Discord member's matched or remembered roster.
- Bounty tracking defaults off with a new versioned preference key, so earlier browser opt-ins do not carry into this release.

## v1.6.0 character-confirmation editor and bounty defaults

- The first-login character confirmation is now an inline editor. Members can correct an IGN with the edit icon, change Class / Job from a dropdown, select exactly one Main character, opt each character into or out of Tracker + Team Builder, and reorder characters with up/down controls. The saved order is projected into the Tracker.
- The Save Changes & Confirm button validates required IGNs, duplicate names, valid Class / Job selections, and exactly one Main before saving. Renamed IGN conflicts with other members are blocked.
- Inline onboarding changes are saved to the signed-in member's Member Roster entry, update character job mappings, rebuild the member's Tracker roster projection, and request cloud sync.
- Bounty Boards are off by default for this release. A versioned local preference key avoids carrying forward an old opt-in; members may explicitly enable them with the Tracker toggle.

## v1.5.9 member onboarding, reset controls, and registration permissions

- The release popup stores the “Don’t show this pop-up again until a new update is released” choice when closed and will not reopen after closing Salary Calculator or Help & Guide for the same version.
- Removed manual Force Daily Reset and Force Weekly Reset controls. The Tracker retains the reminder: daily boards reset automatically; weekly progress resets every Saturday at 9:00 AM Manila time.
- Removed the character-registration shortcut from the main drawer. Guild-wide character registration and Main-designation controls are available only in `/admin.html` under **Character registration & Main designation**.
- The Tracker shows an empty-state message when the signed-in member has no active characters, with actions to start tracking registered characters or register/add more characters.
- On first login, a member is prompted to register characters or confirm each existing IGN, Class / Job, and Main designation. If an administrator changes the registration, confirmation is reset and requested again at the member’s next login.
- Admins can add, remove, edit, and designate each member’s Main character from the Admin Console. Saves validate required classes, unique IGNs, and exactly one Main for non-empty registrations.
- Added a server-side registration guard to shared-record writes: regular members can update their own registration and tracker data but cannot alter another member’s registration, roster, character-job mapping, or ownership. Admin endpoints retain guild-wide control.
- Members’ edits no longer attempt guild-wide cleanup of unrelated legacy character-job entries.

## v1.5.8 account placement, identity, and contrast fixes

- Removed the floating account rectangle from the global toolbar. The existing Overview profile chip now displays the authenticated label, Administrator/Member role, Admin shortcut for admins, and Log out button.
- Personal View applies the resolved or remembered roster ID directly to both the mode button and the roster filter. Existing saved identity is considered after the account-switch safeguard, and refreshes preserve the active Personal View filter.
- Discord avatars support both hashes and full CDN URLs stored in existing sessions. New OAuth sessions store the raw avatar hash so animated Discord avatars can use the proper file extension.
- Card Database card IDs and stat badges use solid high-contrast fills, with white numeric values in all four themes.
- Team Builder Job values display as high-contrast filled badges in all four themes.

## v1.5.7 interface, personalization, and access updates

- Overview banner uses the existing `Guild Banner.png` file from the repository root.
- Tracker starts in Personal View when a verified Discord account has a linked roster. Legacy saved Tracker Universal startup preferences are upgraded to Personal View.
- The Tracker has a `Track Bounty Boards` toggle. Bounty 1–6 rows are hidden by default and can be shown on demand.
- Tracker table surfaces, completion states, bounty text boxes, and Salary Calculator receipt now follow the selected appearance theme.
- Signed-in Discord profile picture, account name, Admin shortcut, and Log out control are visible in the top toolbar.
- Tracker Registration and Member Roster are owner-scoped for regular members; administrators retain the guild-wide controls. Ledger is limited to Cho, Bio, and Cheean.
- Removed the redundant Join Pantheon Discord panel from Overview.

## v1.5.6 interface and performance updates

- The login banner displays the entire `banner.png` image using `contain`; no title text is overlaid on the image.
- The header reads **Pantheon Tools** and **Dragon Nest - Classic SEA [Guild Operations]**. The brand remains the home control that returns signed-in users to Overview.
- Overview follows the approved mockup layout: tool cards, the banner in the open area, Recent Workspace Activity reminders, the Discord invite, and Shared Data / Sync Status / Permissions beneath it.
- Overview reminders are calculated from the current Tracker's eligible weekly tasks (bounty tasks excluded from completion rates) and the existing opt-in weekly analytics archive. They are reminders rather than a fabricated audit log.
- Tracker clicks update only the affected cell and character completion rate. Hidden tools are not rebuilt after every save; they refresh when visible or when a remote change requires reconciliation.
- Dark, Light, Eye comfort, and Pastel remain available across the working tools and admin console. Existing font families are preserved.
- The release popup displays the bundled version; a dismissal saved for an older version does not suppress a newer update.

## Important before deploying

- Keep your current site and JSONBin records as backups until testing is complete.
- Keep the existing D1 database named `pantheon-db`; do not delete it.
- The HTML and function code in this bundle need to be added to the root of the GitHub repository. Preserve other existing assets such as `Guild Banner.png`. The sign-in banner background expects your `banner.png` file in that same repository root, alongside `index.html`. The Overview banner uses `Guild Banner.png` (exact filename, including spaces), so keep that existing image at the repository root as well. The sign-in banner contains no overlaid title text; use an image that already includes any artwork or lettering you want visible.
- This ZIP is the v1.6.6 build and carries forward the v1.5.7–v1.6.4 changes documented below. Back up the current repository before replacing its files.
- Static HTML is not a secret. The real gate is that every shared-data API endpoint requires a valid Discord session and an enabled account in the D1 allowlist.

## A. Prepare a safe GitHub branch

Do not replace the current production branch while testing; that could affect your existing GitHub Pages site.

1. Open `https://github.com/pantheonguilddn/dntrckr` and choose **Code**.
2. Open the branch selector (normally it says `main`). Enter `cloudflare-secure` and choose **Create branch: cloudflare-secure from main**. If your default branch has another name, create the new branch from that default branch instead.
3. Switch to the new `cloudflare-secure` branch and confirm the broken `wrangler.jsonc` from the previous attempt is absent. This bundle intentionally has no Wrangler file.
4. Extract this ZIP on your computer. The ZIP contains the app files directly at its root.
5. In GitHub, choose **Add file → Upload files**. Upload the *contents* of the extracted `Pantheon_Cloudflare_Pages` folder to the repository root, not the enclosing folder itself. This includes `index.html`, `admin.html`, `schema.sql`, and the `functions/` directory. The old P badge image is no longer used. Also upload your `banner.png` to that same root folder. Keep `Guild Banner.png` and other unrelated assets. The supplied `index.html` is the v1.6.6 build, carrying forward the current app, access-control functions, and dashboard updates described in this README; back up the current branch before replacing it.
6. Commit these changes to `cloudflare-secure`, not `main`. Leave the existing production branch untouched while testing.

## B. Create the Cloudflare Pages project

1. Open the Cloudflare dashboard and choose **Workers & Pages**.
2. Select **Create application → Pages → Connect to Git**. Do not choose the Worker Builds screen; it shows Preview command and Deploy command fields, which this setup does not use.
3. Connect GitHub if prompted and select `pantheonguilddn/dntrckr`.
4. Configure the build:
   - Project name: `pantheon-tools` (or another available name you prefer).
   - Production branch: select `cloudflare-secure`.
   - Framework preset: `None`.
   - Build command: leave blank.
   - Build output directory: `.` because `index.html` and `functions/` are placed at the repository root.
   - Root directory: leave blank.
5. Click **Save and Deploy**. Wait for a successful Pages deployment and note the assigned `https://PROJECT-NAME.pages.dev` address.

If you cannot select `cloudflare-secure` during setup, finish connecting the repository first, then open **Settings → Builds → Branch control** and select `cloudflare-secure` as the Production branch. Keep the existing GitHub Pages branch unchanged. If the Pages option is not shown, return to **Create application** and choose Pages, not Workers. No Preview command or Deploy command is required in Pages.

## C. Create the D1 tables

1. Open **Storage & Databases → D1** and select the existing `pantheon-db`.
2. Open its SQL **Console**.
3. Open `schema.sql` from the GitHub repository, copy its complete contents, paste into the D1 console, and click **Execute**.
4. Confirm it succeeds. The statements use `CREATE TABLE IF NOT EXISTS`; running the schema again is safe and does not delete existing records.

## D. Bind D1 to Pages (dashboard only)

1. Open **Workers & Pages → pantheon-tools**.
2. Open **Settings → Bindings**.
3. Choose **Add binding → D1 database**.
4. Use variable name `PANTHEON_DB` and select database `pantheon-db`.
5. Save the binding. If Cloudflare offers production/preview choices, configure Production. Keep preview deployments disabled until production works.
6. Redeploy the Pages project so the binding is active.

Do not create a `wrangler.jsonc` fragment or paste D1 configuration into a new file. This setup relies on the dashboard binding, and there is no Wrangler file in this bundle.

## E. Register Discord OAuth

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application named `Pantheon Tools`.
2. Under **OAuth2**, copy the Client ID and generate/copy the Client Secret.
3. Under **OAuth2 → Redirects**, add the exact callback URL using your actual Pages hostname:

   `https://YOUR-PROJECT.pages.dev/auth/discord/callback`

   Replace `YOUR-PROJECT` with the Pages subdomain Cloudflare gave you. Do not include a trailing slash.
4. Save the Discord application settings.

The bundle requests the `identify` scope only. It does not request a Discord password, bot token, server-management permission, or message access.

## F. Add Pages environment variables

1. In Cloudflare, open **Workers & Pages → pantheon-tools → Settings → Variables and Secrets**.
2. Add these to the **Production** environment:
   - `DISCORD_CLIENT_ID` — text variable; paste the Discord Client ID.
   - `DISCORD_CLIENT_SECRET` — secret; paste the Discord Client Secret.
   - `BOOTSTRAP_ADMIN_DISCORD_ID` — text variable; paste your own numeric Discord user ID.
3. Save and redeploy the Pages project.

To get your numeric Discord ID, enable **User Settings → Advanced → Developer Mode** in Discord, then right-click your own profile and choose **Copy User ID**. Paste only the numeric ID in Cloudflare. The first login from that exact account automatically creates the initial admin allowlist entry.

Never put the Client Secret into GitHub, HTML, a public file, or the D1 tables.

## G. First administrator login

1. Open `https://YOUR-PROJECT.pages.dev`.
2. Click **Continue with Discord** and authorize the application on Discord's official domain.
3. If the configured `BOOTSTRAP_ADMIN_DISCORD_ID` matches the account, the backend adds that account as the initial admin and opens Pantheon.
4. If you get an authentication-service-not-ready message, check that the D1 schema ran, the Pages `PANTHEON_DB` binding is saved, all three variables are configured, and the latest deployment succeeded.

## H. Import existing JSONBin data

If your guild currently has JSONBin data, migrate it before adding other members.

1. While signed in as the bootstrap admin, open `https://YOUR-PROJECT.pages.dev/admin.html` or choose **Admin** beside the logged-in Discord profile in the top toolbar.
2. Under **Move the old guild record from JSONBin to D1**, enter the existing main tracker Bin ID and its JSONBin Master Key.
3. Confirm the checkbox and click **Import main record and revision journal**.
4. The page fetches the existing main record and, if configured in the main record, its separate revision journal. It sends those records to the authenticated D1 import endpoint. The old JSONBin records are read only and left untouched.
5. After a success message, clear the key field (the page clears it on success), return to Pantheon, and reload. The tracker now reads/writes through the protected D1 API.

If JSONBin reports an error, stop and keep the JSONBin record as your active backup; do not initialize an empty tracker over your only copy of the data. If you have no old guild data to migrate, use **Initialize empty tracker** instead. That action refuses to overwrite an existing `pantheon-main` record.

## I. Add permitted Discord accounts

1. Open `/admin.html` while signed in as an admin.
2. Enter each member's numeric Discord User ID. Leave **Roster match name** blank when their Discord profile display name matches their Member Roster owner name. If it differs, enter the exact Member Roster owner name once as the roster-match fallback.
3. Click **Add / enable account**.
4. Tell the member to open the Pages URL and click **Continue with Discord**. They do not need a JSONBin ID or key. Their account will be denied until their numeric ID is added.
5. Use **Revoke** to disable an account. Revoking deletes its stored sessions so its next API request is denied.

This is an account allowlist, not a live guild-membership check. Personal View automatically matches the signed-in Discord display name to the Member Roster owner name; a configured roster-match fallback is used only if the profile name does not match. Manual fallback selections are remembered per Discord account in that browser. Removing someone from the Discord server does not automatically remove their app access unless an admin revokes their ID here.

## J. Test before inviting the guild

1. Sign in as the bootstrap admin and confirm shared data loads.
2. Add a second test Discord ID, sign in with that account, and confirm it can sync.
3. Try a third unapproved account and confirm it sees the access-denied gateway.
4. Check that unapproved requests to `/api/cloud/b/pantheon-main/latest` return `401` rather than guild data.
5. Edit a harmless test item in one browser and verify another authorized browser receives the update.
6. Check Workers/Pages and D1 metrics after ordinary use. JSONBin should no longer be used for normal live sync after migration.

## Free-tier expectation

Cloudflare's published Workers Free quota includes 100,000 requests per day; D1 Free includes 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage. This small guild tracker is designed to fit those limits with modest usage and no 30-second whole-record polling. Limits can change, so monitor the dashboard. Pages static-asset requests themselves do not count as Pages Functions invocations; API, OAuth, and D1-backed requests do.


## Sign-in and Overview banners (v1.5.7)

- Place `banner.png` in the same root folder as `index.html`; it is used for the Discord sign-in banner and is displayed with `contain` so the full image fits. No title text is overlaid on the image.
- Keep `Guild Banner.png` in that same root folder. The Overview uses that exact filename for the guild banner. The v1.5.6 ZIP did not include `Guild Banner.png`, so verify the existing repository asset is retained when uploading this release.

## Appearance themes (v1.5.4)

The tracker and administrator console include Light, Dark, Eye comfort, and Pastel themes. The preference is stored locally under the same origin and carries between the tracker and admin page. Themes apply to the sign-in gate, app views, controls, forms, and modal dialogs. Theme overrides change colors and surfaces only; existing application typography declarations are preserved.

Upload `guild-logo.png` to the same published root directory as `index.html` and `admin.html`. The tracker header, Discord sign-in gate, and administrator console reference this file. Keep `Guild Banner.png` as well; Overview and release/banner areas still use it.


## Earlier v1.5.4 interface update

This release refreshes the presentation of the existing Tracker, Team Builder, Card Database, roster, overview, dialogs, and administrator console with a consistent card-based layout, unified spacing, refined inputs and controls, and the existing four appearance themes. It preserves the existing tool logic, Cloudflare Pages Functions, D1 binding, and Discord OAuth flow. The v1.5.6 sign-in banner displays the complete `banner.png` image with no overlaid title. In v1.5.7 the Overview specifically uses `Guild Banner.png`; keep both image files in the project root.

## v1.6.4 changes
- Replaced Recent Workspace Activity with personalized Activity Insights for the signed-in member’s opted-in characters only. Includes completion summaries, quiet/no-progress characters, lower-completion outliers, next-step recommendations informed by loot weights, and comparisons between saved weekly snapshots where available. It avoids assuming a missed task means the member forgot; advice distinguishes inactivity from an intentional change in priority. Bounty tasks remain excluded from completion percentages.
- Hid the Tools sidebar from regular members; members can navigate their everyday workflows through the Overview cards. Added an Overview Member Roster card and an authorized Ledger card for Cho, Bio, and Cheean.
- Moved all former sidebar destinations into a tool launcher in the administrator-only Admin Console. The links use role-checked routes for Dungeon Registration, Loot Weights, Version History, and Sync Now.
- Added client-side administrator checks to open/save/reset functions for Dungeon Registration, Loot Weights, and Version History. This is a UI-level safeguard in addition to existing API-side admin protections.
- Activity Insights and Tracker Personal View are resolved from the current authenticated Discord account and its configured roster-match label; the app no longer falls back to a stale locally selected roster when identity matching fails. Unmatched accounts stay in their own unregistered Personal View until their roster mapping is corrected.
- Updated the HTML document title and release version to v1.6.4.



## v1.6.5 compact Overview and separated completion panel

- Moved Shared Data, Sync Status, and Permissions into the authenticated account area next to the Discord profile and logout control, freeing the old right-side status column.
- Replaced large Help & Guide and Ledger tool cards with compact quick widgets in the signed-in account area. Help is available to all members; the Ledger widget is only shown when the authenticated Member Roster profile is Cho, Bio, or Cheean. It no longer trusts a locally selected roster to decide Ledger visibility.
- Split the lower Overview dashboard into two side-by-side panels on desktop: Activity Insights (personal priority reminders, low-completion outliers, and trend advice) and Character Completion (per-character weekly rates, remaining tasks, and trend/next-task guidance). On narrower screens, the panels stack for readability.
- Kept status values connected to the existing shared-data and sync-state logic, and retained Bounty exclusion from weekly completion rates. The admin-only Tools sidebar and Admin Console launcher remain unchanged.
- Updated release version and notes to v1.6.5.


## v1.6.6 Universal View progress permissions

- Universal View remains available for reading other members’ task completion, completion rates, and bounty notes. It is view-only for characters not owned by the signed-in member. Their checkboxes are disabled, bounty target fields are read-only, and right-click task-state cycling is ignored.
- Tracker event handlers now re-check character ownership before changing a checkmark, cycling a task state, or saving a bounty note. The authenticated administrator retains cross-member management ability.
- The Cloudflare API validates the full shared-record write and rejects attempts by regular members to change task cells belonging to another member, even if the browser UI is modified or bypassed. Normal members also cannot advance the guild-wide reset markers or edit another roster’s per-member reset markers.
- Daily and weekly automatic resets for regular members now apply only to their own tracked characters, using per-roster reset markers. The administrator’s automatic global reset can still reset all characters. Weekly snapshots merge character-by-character so one member’s snapshot does not overwrite another member’s values for the same week.
- Added the new `memberResetMarkers` field to the compact record encoding and merging logic. Existing global reset markers are preserved for compatibility.
- Updated the release version to v1.6.6.
- Weekly archive snapshots also enforce ownership: members can add/update their own character's weekly rate/state, but cannot change another character's archived progress, alter the global task order, or delete a shared archive week. Archive pruning is administrator-only.


## v1.6.8-r8 notes

- Reverted Main-character presentation from theme-tinted fills to the pale-gold border outline, retaining a small gold star for quick recognition.
- Normal theme surfaces and Tracker task-state fills remain intact; the gold outline highlights Main characters without recoloring completion/exclusion states.
- Cosmetic-only change; no schema, API, permission, or event-setting changes.

## v1.6.8-r7 notes

- Main characters now use a theme-aware soft fill and a small star instead of a heavy outline or star badge. Task-state colors in Tracker remain distinct, with subtle Main column tinting.
- Character Activity Summary uses plain-language status labels, separates recorded task progress from Lucky Zone time estimates, and explains that unticked tasks are not proof the character was not played.
- Lucky Zones are not tracked; estimated time is calculated as three solo runs at approximately eight minutes per registered character. Removed the confusing 'open tracked dailies' count.
- Reworked only the existing Main/Pulse appearance and copy; no schema or API changes.


## v1.6.8-r27 – Saturday-start raid cadence

- Corrected the baseline guild-run schedule: Saturday is the start of raid day, Saturday/Sunday are the peak days, and Monday remains a possible spillover day. Friday is treated as a normal weekday and no longer receives a preparation-day multiplier or “Prepare weekend group” label.
- Removed the Friday-only recommendation in the Overview deadline banner. The banner now explains the Saturday-start cadence without telling players to pre-plan guild raids on Friday.
- The timing signal remains separate from personal clearability: weekday public clears continue to count for the character, and actual opt-in completion timestamps may refine the weekday baselines over time.
- No API or schema change. Built directly from r26; all existing 32 package paths are preserved.

## v1.6.8-r26 – Weekend guild-run learning and custom events

- Added rolling completion-time records for group-dependent tasks when shared weekly analytics is enabled. Records are bounded to the latest six weekly windows and merge by most recent state/timestamp. Analytics history clear also clears this timing record.
- Added a separate guild-run cadence model. It starts from the guild's known pattern (Saturday/Sunday peak, Monday spillover, Friday preparation, lower Tue–Thu availability) and learns from clustered same-activity clears across different registered guild members. Where member ownership is available, multiple alts belonging to one person do not count as multiple attendees. This signal only adjusts group-availability planning; it does not lower a character's personal clearability or replace their archived per-activity completion history. Public-party clears still count toward the character's own history. Where roster ownership is available, multiple alts belonging to one member are not counted as multiple guild attendees. The starting weekend/Monday pattern applies even before enough opt-in timing observations exist.
- Added an optional guild-cadence explanation to the existing Overview/Tracker deadline banner and detailed score explanation.
- Added up to 30 administrator-managed custom events under Rate-Up Event Settings. Each event has a name, optional note, enabled status, recurring weekend or one-time Manila-time schedule, and start/end. Active events appear in the shared active-event strip (capped to two custom events plus a count to keep the banner readable); active/upcoming events can appear in Overview planning notes. Enabled custom events require a name before saving. Existing Item Drop, Enhancement, and EXP Boost settings remain unchanged.
- No D1 schema migration required; the new properties use the existing shared tracker record and Rate-Up settings timestamp.
- Validation notes: JavaScript syntax, CSS parsing, package integrity, event normalizer, timing merge, weekday schedule behavior, and UI event form tests were run locally. Live Cloudflare Pages/D1/Discord integration still needs production verification.
