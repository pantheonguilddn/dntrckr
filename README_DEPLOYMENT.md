# Pantheon Tools v1.6.8-r51 — Player Ownership Audit Patch

## Deploy

1. Keep a copy of the currently deployed Pages release as rollback.
2. Upload the complete contents of the r51 ZIP to the existing Cloudflare Pages project.
3. Preserve the existing `PANTHEON_DB` D1 binding, Discord OAuth settings, environment variables, and project configuration.
4. Do **not** rerun the r50 player-storage migration or execute a new SQL file. r50 already completed the migration; r51 only audits and repairs Discord-to-roster ownership links.
5. Sign in with an administrator account and open **Admin Console → Player ownership audit**.

## Review and resolve the audit

- **No confirmed Discord account:** choose the correct enabled allowlist account and select **Link account**. An exact display-label match is only a suggestion; verify the actual member before saving.
- **Duplicate Discord ID:** identify which Member Roster entry is correct. Clear the link only from the incorrect entry, then link the verified account to the correct owner.
- **Bootstrap Admin identity on the wrong owner:** clear the misplaced Admin ID from the incorrect roster entry, then attach it to the configured personal owner. The configured personal-owner link itself is protected from clearing.
- **Account not enabled:** enable the correct Discord ID in the allowlist, then refresh the audit.
- **Duplicate character IGN:** in **3. Character registration & Main designation**, remove the duplicate registration from the incorrect owner and retain the IGN under its actual owner. Then rebuild the ownership index. Do not rename the IGN as a shortcut; existing task cells remain attached to the retained IGN key.
- **Ownership index out of date:** select **Rebuild ownership index**. This re-derives the index from the Member Roster and does not change task progress.

Every account-link change requires an authenticated administrator and the explicit Admin Mode request. The endpoint rejects attempts to assign one Discord ID to multiple Member Roster owners.

## Safety

- The r50 player-storage migration is not rerun.
- No D1 schema changes are included in r51.
- No task cells, completion timing, character registrations, or owner records are deleted by link/clear-link actions.
- The original `pantheon-main` record and all player-storage tables remain intact.
- Universal View remains read-only for ordinary members. Admin View is still required for cross-owner editing in the main app.

## Validation boundary

Local mocked-D1 tests cover owner audit classifications, enabled-account checks, duplicate-ID rejection, bootstrap identity protection and repair, misplaced bootstrap-ID cleanup, Member Roster compare-and-swap updates, owner-index refresh, and character-progress preservation. JavaScript, HTML/CSS, function imports, and ZIP integrity are checked locally. This release has not been deployed to or tested against the live production D1 database; refresh the audit after deployment and review every mapping before changing it.
