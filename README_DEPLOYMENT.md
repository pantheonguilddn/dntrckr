# Pantheon Tools r53 deployment notes

Deploy the ZIP contents to the existing Cloudflare Pages project. Keep the existing D1 binding (`PANTHEON_DB`), database, OAuth configuration, and environment variables unchanged. Do not recreate or clear the database.

No manual SQL migration is required for r53. The release adds the authenticated `PUT /api/profile/name` Pages Function route and updates identity resolution in the existing app. The route updates only the signed-in Discord member's own Pantheon display name, retaining the stable Discord link, member ID, Tracker roster ID, character IGNs, and tracker progress.

After deployment, verify that toggling Admin View while on Overview and while in Universal View does not change the current page or Personal/Universal selection. Then sign in as a linked member, choose Overview → Change Name, and confirm their renamed profile is still linked to the same characters and progress.

No browser-storage clearing, D1 deletion, or manual SQL step is part of this deployment.
