# Pantheon Tools v1.6.9-r39

## Guild Forum reply photo attachments

- Added a photo attachment picker to every reply composer, including replies to existing comments.
- Replies support text plus a photo, or a photo-only reply. One image can be attached per reply.
- The picker shows a local preview, compressed file name, preparation status, and a remove action before sending.
- Reuses the existing client-side image compression flow: JPEG output, maximum 1,400 px on the long side, target size approximately 250 KB.
- Attached reply photos render inline in the comment thread and use an authenticated same-origin image endpoint.
- Existing plain-text comments and original forum-post photo attachments remain compatible.

## Storage and migration

- Added `image_data` and `image_mime` fields to `guild_forum_comments`.
- Existing installations receive an additive, automatic migration when the forum API initializes. Existing replies are preserved with empty photo fields. The migration tolerates simultaneous initialization by multiple isolates.
- Updated `schema.sql` for fresh installations. No R2 bucket or new external service is required; this follows the existing forum-post image storage pattern.
- This does add compressed image data to D1 when members attach reply photos. Images are capped at approximately 250 KB each after client-side compression. No Tracker tables, member roster data, or weekly history are changed.

## Validation

- Inline JavaScript syntax checks and Pages Function syntax checks
- CSS and HTML structure checks
- Forum comment-table migration and insert/select smoke tests
- Reply-photo URL / DTO checks
- ZIP integrity and root-layout checks

The release package is not deployed to Cloudflare. A live browser upload test was not available in this environment.
