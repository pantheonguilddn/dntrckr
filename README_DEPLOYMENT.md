# Deploy Pantheon Tools r66

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r66.zip`.
2. Upload all ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding, Discord OAuth settings, and environment variables unchanged.
4. Do not reset D1 or clear browser data. The community profile API upgrades its existing profile table automatically on first use by adding the two banner columns.
5. Open your own member profile, choose Upload banner, and select Save profile. The image is cropped and compressed in the browser before storage.

The banner is optional. Members may change or remove their own banner. Discord avatars remain independent and are not replaced. The profile text uses automatic light/dark contrast based on the uploaded banner's sampled brightness.

No tracker schema, checkbox-sync, guild forum, or character ownership changes are included. The What's New popup remains disabled. No live production test was performed.
