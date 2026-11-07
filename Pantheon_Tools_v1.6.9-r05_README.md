# Pantheon Tools v1.6.9-r05

## Hotfix: release auto-refresh loop

- Corrected the client release checker's embedded `CURRENT_BUILD` marker to `1.6.9-r05`.
- The r04 page incorrectly identified itself as `1.6.9-r03` while `version.json` identified the deployment as `1.6.9-r04`. This caused each page load to detect r04 as a newer build and queue an automatic reload repeatedly.
- Preserves the r04 D1-safe cell batching (`json_each`) and 40-edit per-character client batching. No authentication, session, database schema, or data migration code was changed for this hotfix.

## Deployment

Deploy the complete ZIP to the existing Cloudflare Pages project. Keep the current D1 binding, OAuth settings, environment variables, and database. Do not clear browser storage.

## Validation

Static release-marker checks, inline JavaScript syntax checks, and ZIP integrity checks passed locally. Live Cloudflare deployment and multi-account testing remain necessary.
