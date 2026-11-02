# Deploy Pantheon Tools r65

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r65.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding, Discord OAuth settings, and environment variables unchanged.
4. Do not run SQL, reset D1, clear browser data, or remove the old tracker record. This release adds no database tables or columns.
5. After deployment, open a member profile. The former Recent activity list is replaced by Weekly activity and Next focus.

Activity ratio is computed from the current D1 character cells for that member's Tracker-enabled characters. It excludes Bounty tasks, Admin-selected Extra Dungeons, and cells marked N/A. Next focus is a suggestion based on the shared Loot Weight order, prioritizing the main character first. It is advisory only; members can still choose any task.

The What's New popup remains disabled. No new polling loop or tracker save behavior is added.
