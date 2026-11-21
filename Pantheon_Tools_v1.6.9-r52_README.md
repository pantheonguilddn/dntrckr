# Pantheon Tools v1.6.9-r52 — Activity Insights logic

## What changed

Rebuilt the Overview Activity Insights carousel so it surfaces useful, evidence-based signals instead of repeating generic status cards with fresh numbers.

- **Fresh-reset behavior:** A newly reset week no longer produces a `0% complete` insight or generic `not started` / `quick check` warnings just because the task cells have reopened.
- **Personalized next move:** The first recommendation is selected using the existing shared task importance, activity value, per-character clear history, character/job and raid fit, and reset-aware scoring. Existing recommendation suppression rules are still honored.
- **Previous saved-week recap:** Early in the week, the carousel can show the latest saved weekly snapshot as context, including the overall result and strongest character finishes. It is treated as historical baseline data, separate from the new week's counters.
- **Real current-week activity:** A progress insight appears only after actual work has been recorded (at least two completions, one completion after 30 hours, or three explicit marked tasks). A reset-written/open cell is not counted as activity.
- **Evidence-based character check-ins:** A character is only flagged for a missing check-in after 72 hours and only when their saved history shows completions in at least two of the last three saved weeks. The wording asks the player to confirm their rotation; it does not assume they must play that character.
- **Meaningful historical trends:** Small fluctuations are suppressed. A trend is surfaced only when the latest comparable saved-week change is at least 10 percentage points.
- **Deadline relevance:** Deadline-focused reminders remain available in the final 72 hours, using the existing reset-aware priority and task recommendation logic.
- **Adaptive carousel:** The carousel now builds only the slides supported by the member's current activity and available history, up to four slides. It can show fewer slides rather than filling space with low-signal content.

## Preserved

- The Overview Activity Insights carousel controls, navigation, drag/swipe behavior, pause/resume behavior, and auto-rotation remain in place.
- Character Completion remains a separate section below the carousel.
- Tracker, Bounty Board, Team Builder, Forum, Guild Hub, themes, authentication, member-specific ownership, synchronization, resets, and historical archives are unchanged.
- Recommendations are advisory only. This change does not modify task states, checkboxes, bounty notes, or saved weekly data.
- All Pages Functions, `admin.html`, and `schema.sql` are unchanged from r51.
- No D1 migration, manual SQL, browser-storage clearing, database reset, OAuth change, secret change, or binding change is required.

## Validation performed

- All 7 inline JavaScript blocks passed Node syntax checks.
- All 31 Pages Function JavaScript files passed syntax checks.
- HTML parser check passed with no duplicate IDs.
- A focused logic fixture tested: fresh reset with zero current-week activity, real current-week completions, and a late-week missing check-in for a character with repeated historical activity.
- Confirmed the fresh-reset case shows actionable kickoff / saved-week context and does not show `0% complete`, `not started`, `no completions`, or generic quick-check warnings.
- Confirmed current-week activity appears only when qualifying cell changes exist, and historical check-ins appear only after the time and history gates.
- Version markers in `index.html` and `version.json` match r52.
- ZIP layout and archive integrity checked.
- No live Cloudflare deployment or production D1 test was performed.
