# Deploy Pantheon Tools v1.6.8-r71

1. Back up your current deployment files, then upload the complete contents of `Pantheon_Cloudflare_Pages_v1.6.8-r71.zip` to the existing Cloudflare Pages project. Preserve the `functions/` directory structure.
2. Keep the existing `PANTHEON_DB` D1 binding and Discord/OAuth environment settings unchanged.
3. Do not run SQL, reset D1, clear browser storage, or delete the existing Tracker records.
4. After deployment, sign in as Admin and open **Admin Console → 5. Extra Dungeons**. Existing selections and legacy default-N/A tasks should appear checked. Save once to synchronize the shared setting.
5. To add DDN Memoria: open Dungeon Registration, select the existing Special Dungeon category, enter `DDN Memoria`, and optionally tick **Add to Admin Console #5: Extra Dungeons** before registering. Alternatively, register it normally and then check it in Console #5.
6. Once selected, its Tracker cells default to muted N/A. A character owner right-clicks only that character's cell to opt in; the selection is independent for every character.

The package includes the existing r70 category-ID fallback. No live D1 deployment or production end-to-end test is performed by local package validation.
