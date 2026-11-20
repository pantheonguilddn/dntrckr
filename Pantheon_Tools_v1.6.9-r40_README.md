# Pantheon Tools v1.6.9-r40 — Guild Forum editing and moderation

## Editing
- Members can edit the title, category, and body of their own Guild Forum posts.
- Members can edit the text of their own replies, including nested replies.
- Editing is inline and includes Save / Cancel controls.
- Existing photo attachments are preserved when text is edited; this release does not replace or remove attached photos through the edit form.
- Announcement category restrictions remain enforced: only administrators can create or change a post into the announcement category.

## Removal permissions
- Members can remove their own posts and replies.
- Administrators can remove posts and replies from any member.
- Members cannot remove other members' content.
- These permissions are enforced by the API using the authenticated Discord identity and the enabled user's server-side role, not just by whether a UI button is displayed.
- Administrators can edit their own posts/replies, but editing another member's content is not enabled; moderation of other members' content is removal-only.
- Existing post deletion continues to remove its associated replies. Existing comment deletion behavior is preserved.

## Preservation
- Existing post and reply photos, discussion contents, categories, pins, and counts remain stored in the existing D1 tables.
- No new columns, tables, external storage services, or D1 migrations are required.
- Existing photo reply support from r39 is retained.
- Tracker data, weekly archives, character roster, authentication, and synchronization are unchanged.

## Validation
- JavaScript syntax checks for all inline scripts and Pages Function modules.
- CSS parsing and HTML structure checks.
- Static permission-path checks for owner-only edits and owner/admin removal.
- ZIP integrity and release-marker consistency checks.
- No live Cloudflare deployment or browser visual test was performed in this environment.
