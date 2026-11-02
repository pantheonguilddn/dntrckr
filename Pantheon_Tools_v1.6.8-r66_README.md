# Pantheon Tools v1.6.8-r66

## Changes
- Removed redundant Guild Forum buttons from the Guild Forum modal header and member profile card. The member-rail entry point remains.
- Added optional member profile banners. Members can upload, replace, or remove their own banner from their profile.
- Banner images are center-cropped to a wide 1400 × 420 image and compressed to WebP (maximum 135 KB) before upload.
- Profile text contrast is selected automatically from sampled banner luminance. Dark images use light text with a dark scrim; bright images use dark text with a light scrim.
- Existing Discord avatars, profile bio, character roster, Weekly Activity, and Next Focus remain unchanged.

## Persistence and safety
- Banner data is stored with the existing `guild_member_profiles` row, keyed by the authenticated Discord ID. Members cannot edit another member's banner.
- The community profile API adds `banner_data_url` and `banner_text_mode` columns on first use. Existing bio rows are upgraded in place; no manual SQL step or D1 reset is required.
- Only compressed WebP data URLs are accepted, capped at 190,000 characters by the API. Client compression targets a maximum of 160 KB.
- Banner removal is saved with the same Save profile action as the bio.
- No new polling loop, background reads, or forum behavior changes are introduced.
- The What's New popup remains disabled.

## Deployment
Upload the complete ZIP contents to the existing Cloudflare Pages project, retaining the `PANTHEON_DB` binding, Discord OAuth settings, and environment variables. Do not clear browser data or reset D1.

## Validation
JavaScript syntax, CSS parsing, profile API SQL against SQLite, existing-table upgrade path, input validation, and ZIP integrity were checked locally. No live Cloudflare deployment or production D1 test was performed.
