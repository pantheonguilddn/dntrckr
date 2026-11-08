# Pantheon Tools v1.6.9-r07

## Member Roster projection preservation fix

- Corrected the Member Roster projection so adding or editing one member cannot drop the existing Tracker characters of unrelated members.
- The client now preserves previously tracked character names while it builds a local roster preview. A character is removed from the committed Tracker roster only when the edited member's explicit server-side upsert carries that opt-out.
- The server now preserves the previous Tracker character list for every member not explicitly included in the current `add` or `upsert` intent. Only the target member's submitted `trackerEnabled` values can change that member's tracked characters. Explicit `remove` intents still remove only the selected member.
- This preserves older roster records whose normalized `trackerEnabled` flags defaulted to false even though their characters were already in Tracker.
- The r06 server-side per-member intent protection remains in place: stale whole-directory writes are rejected, and additions are applied to the latest server-side Member Directory.
- Task-cell data remains in its existing storage tables; this fix changes roster projection and ownership indexing only. It does not intentionally rewrite or reset progress cells.

## Deployment

Deploy the complete Cloudflare Pages bundle, including the updated `functions/api/cloud/b/[id].js`, `index.html`, and `version.json`. Keep the existing D1 binding, database, Discord OAuth settings, and environment variables. Do not reset D1, clear browser storage, or perform another Time Travel restore.

After deployment, confirm `/version.json` reports `1.6.9-r07`. Before testing another member addition, verify that the Member Roster and Universal View show the expected current roster. If characters are still missing after r07, stop and inspect the existing `character_owners` index rather than repeating Add Member.

Local JavaScript syntax checks and a focused projection test were run against the included source. No live Cloudflare deployment or live D1 test was performed.
