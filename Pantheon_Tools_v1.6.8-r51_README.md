# Pantheon Tools v1.6.8-r51 — player ownership audit and safe owner-link repair

## Purpose

This release adds an administrator-only audit for the 28 character records reported as unlinked after the r50 player-storage migration. It does not rerun the migration, alter task progress, or change the player-isolated character/task storage design.

## What changes

- Adds `/api/admin/character-storage/owners`, an authenticated administrator endpoint that audits every Member Roster owner, registered character, confirmed Discord ID, allowlist status, duplicate Discord links, duplicate character IGNs, and owner-index mismatches.
- Adds a Player Ownership Audit section to `admin.html`. It groups registered characters by their Member Roster owner and reports why each owner or character is not fully linked.
- Exact allowlist-label matches are suggested for administrator review, never assigned automatically.
- An administrator can explicitly link an enabled Discord account to a roster owner. The server refuses to assign one Discord ID to multiple roster owners and protects the configured bootstrap administrator identity so it remains attached to the configured personal owner.
- An administrator can clear a duplicated Discord link from an explicitly selected incorrect roster entry. A misplaced bootstrap Admin ID can also be cleared from the wrong owner even when it is the only link, while the configured personal-owner link is protected. This changes only the identity link; it does not delete the owner, characters, cells, or completion history.
- Adds a forced owner-index rebuild action. It re-derives the index from the canonical Member Roster without changing character progress.
- All identity mutations require an authenticated administrator plus the explicit Admin Mode request header and are written to the audit log.
- No D1 schema migration is required. No existing storage tables or data are deleted. The r50 player-storage migration is not rerun.

## How to use

1. Deploy the complete r51 ZIP contents to the existing Cloudflare Pages project. Keep the current D1 binding and Discord/OAuth settings. Do not rerun the completed r50 migration or execute a separate SQL script.
2. Sign in with an administrator account and open **Admin Console**.
3. Open **Player ownership audit**. The audit displays every Member Roster owner, their characters, Tracker opt-in, and the exact ownership-link status.
4. For an owner with no confirmed Discord identity, select the correct enabled allowlist account and choose **Link account**. A label match is only a suggestion; verify it against the actual guild member before saving.
5. For a duplicated Discord ID, identify the incorrect roster entry and choose **Clear duplicate Discord link on this entry**. Then link the correct account to the correct owner. Do not clear the bootstrap administrator's configured personal-owner link.
6. For duplicate character IGNs, keep the IGN only under its actual owner in Character Registration, then rebuild the ownership index. Do not rename the IGN as a shortcut; existing task cells stay attached to the retained IGN key.
7. Use **Rebuild ownership index** only when the audit explicitly reports an index mismatch.

## Ownership and data safety

- Every registered player is represented through the canonical Member Roster, regardless of how many guild members are registered.
- A Discord ID can own only one Member Roster entry.
- A character IGN can belong to only one owner. Duplicate IGN conflicts are surfaced explicitly; resolve them by keeping that IGN under the actual owner in Character Registration, then rebuild the ownership index. Task cells remain attached to the retained IGN key; do not rename an IGN as a shortcut.
- Linking an account does not transfer character ownership or move progress; it connects the account to the existing roster entry.
- Clearing a duplicate link does not delete character progress.
- Universal View remains an aggregate read-only view for ordinary members. Admin View is still required for cross-owner editing.
- The existing `pantheon-main` record and all character-task rows remain intact.

## Validation boundary

Local checks cover JavaScript syntax, duplicate HTML IDs, audit classifications for missing/duplicate/unapproved/linked accounts and bootstrap identity mismatches, ownership-link rejection for accounts already assigned elsewhere, protection of the configured bootstrap personal-owner link, explicit cleanup of a misplaced bootstrap ID, CAS retry behavior for roster metadata, owner-index refresh behavior, progress preservation, and ZIP integrity. This package has not been deployed to or tested against the live production D1 database. Re-check the audit after deployment before changing any owner mapping.
