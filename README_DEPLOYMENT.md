# Pantheon Tools r54 deployment notes

Deploy the ZIP contents to the existing Cloudflare Pages project. Keep the existing D1 binding (`PANTHEON_DB`), database, OAuth configuration, environment variables, and allowlist unchanged. Do not recreate or clear the database.

No SQL migration or database changes are required for r54. This is a top-bar and member/admin visibility update only. It removes the redundant account identity dropdown, keeps the single `Only [member]` roster filter, and makes the Admin Tools menu obey its hidden state in both member sessions and administrators with Admin View disabled.

After deployment, check the top bar as an ordinary member, as an administrator with Admin View off, and as an administrator with Admin View on. In Universal View, use the remaining `Only [member]` selector to filter the tracker to a specific member. In Personal View, the authenticated Discord account's confirmed roster remains selected automatically.

No browser-storage clearing, D1 deletion, or manual SQL step is part of this deployment.
