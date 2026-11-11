# Deploy Pantheon Tools v1.6.9-r13

1. Back up the current deployment package and confirm the database recovery point.
2. Upload the complete ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing D1 binding, Discord OAuth settings, secrets, and environment variables unchanged.
4. Do not reset D1, run SQL, clear browser storage, or re-register characters.
5. Confirm `/version.json` reports `1.6.9-r13`.
6. In Admin View → Dungeon Registration, submit `Black Dragon (Hardcore)` again using the intended category. If already registered, this is an idempotent repair of its Tracker task-index row and does not create a duplicate.
7. Refresh the Tracker and verify the task can be edited.

This r13 hotfix retains the r11-based Class / Job Catalog from r12 and fixes the missing D1 task-index update in the dedicated Dungeon Registration endpoint. No schema migration is required. Live deployment and production D1 testing were not performed in this environment.
