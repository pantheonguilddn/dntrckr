# Pantheon Tools v1.6.9-r12

## Class, Job, and Role Catalog

- Adds a guild-managed catalog editor under Team Builder → Role Settings.
- Administrators can add base classes, jobs / specializations, and custom roles.
- Each custom role can be enabled as a primary Raid Position, a secondary capability, or both.
- Silver Hunter is preloaded as an Archer job. It is assigned DPS as its initial primary position, while damage type and secondary role tags are intentionally left unassigned for the guild to configure.
- New catalog entries flow into character registration, Member Roster editing, Character Class Setup, Team Builder class filters, job metadata, and the Team Builder coverage summary.
- The catalog is stored inside the existing shared Job / Role settings and is included in the existing global-change revision history.

## Data and deployment safety

- No D1 schema migration is required.
- No tracker task cells, completion timing, weekly progress, member roster entries, or character registrations are reset or rewritten by this feature.
- Keep the existing D1 database binding, Discord OAuth secrets, and environment variables unchanged.
- Do not reset D1 or clear browser/site storage.
- The existing r11 automatic-reset safeguards are retained unchanged.

## Notes

- Custom role tags appear in Team Builder's role coverage summary. The existing composition warnings continue to check the established core positions (for example Heal and Tank / Provoke); adding a custom role does not silently make it a mandatory party requirement.
- Silver Hunter's damage type and secondary capabilities should be configured after the guild confirms the appropriate Classic SEA role assignment.

## Validation performed

- Inline JavaScript syntax checks passed.
- The HTML parser check passed and all new catalog controls have corresponding unique IDs.
- A normalization regression harness confirmed Silver Hunter defaults to Archer, and custom classes, jobs, primary positions, and secondary roles survive catalog/profile normalization.
- ZIP integrity checked after packaging.

Live Cloudflare deployment and live D1 integration were not performed from this environment.
