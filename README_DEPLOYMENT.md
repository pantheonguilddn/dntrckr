# Deploy Pantheon Tools r55

1. Download `Pantheon_Cloudflare_Pages_v1.6.8-r55.zip`.
2. Upload the ZIP contents to the existing Cloudflare Pages project, preserving the `functions/` directory structure.
3. Keep the existing `PANTHEON_DB` D1 binding and environment variables unchanged.
4. Do not run SQL, reset D1, clear browser data, or remove the old tracker record.
5. After deployment, members should reopen or refresh Pantheon. Any checkbox/note edits still waiting in that same browser profile will be retried automatically after the app confirms player storage is ready.

Admin Discord links are managed under Admin Console > Player ownership audit. To replace a link, choose the new enabled account and confirm. To unlink a non-bootstrap member, use Clear link. The bootstrap Admin personal-owner identity is protected.

Note: no browser can upload while it is fully closed. r55 keeps unacknowledged task changes in local browser storage and resumes delivery when Pantheon next opens. Manually clearing site data or blocking browser storage can remove that local outbox.
