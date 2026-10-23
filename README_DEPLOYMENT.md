# Pantheon Tools v1.5.0 — Cloudflare Pages + D1

This bundle is built from the full Pantheon Tools v1.4.6 tracker HTML and adds a Discord-account allowlist gateway plus a D1-backed JSONBin-compatible data API. It does **not** require a Wrangler configuration file. Bind D1 through the Cloudflare Pages dashboard to avoid the invalid `wrangler.jsonc` issue from the previous attempt.

## Important before deploying

- Keep your current site and JSONBin records as backups until testing is complete.
- Keep the existing D1 database named `pantheon-db`; do not delete it.
- The HTML and function code in this bundle need to be added to the root of the GitHub repository. Preserve other existing assets such as `Guild Banner.png`.
- If the current root `index.html` in GitHub is newer than the supplied v1.4.6-based HTML, do not overwrite it blindly. Reconcile the frontend edits with that newer tracker version first.
- Static HTML is not a secret. The real gate is that every shared-data API endpoint requires a valid Discord session and an enabled account in the D1 allowlist.

## A. Prepare a safe GitHub branch

Do not replace the current production branch while testing; that could affect your existing GitHub Pages site.

1. Open `https://github.com/pantheonguilddn/dntrckr` and choose **Code**.
2. Open the branch selector (normally it says `main`). Enter `cloudflare-secure` and choose **Create branch: cloudflare-secure from main**. If your default branch has another name, create the new branch from that default branch instead.
3. Switch to the new `cloudflare-secure` branch and confirm the broken `wrangler.jsonc` from the previous attempt is absent. This bundle intentionally has no Wrangler file.
4. Extract this ZIP on your computer.
5. In GitHub, choose **Add file → Upload files**. Upload the *contents* of the extracted `Pantheon_Cloudflare_Pages` folder to the repository root, not the enclosing folder itself. This includes `index.html`, `admin.html`, `schema.sql`, and the `functions/` directory. Keep `Guild Banner.png` and other unrelated assets. The supplied `index.html` is based on the full v1.4.6 tracker available for this work; if the branch contains a newer tracker version, do not overwrite it blindly.
6. Commit these changes to `cloudflare-secure`, not `main`. Leave the existing production branch untouched while testing.

## B. Create the Cloudflare Pages project

1. Open the Cloudflare dashboard and choose **Workers & Pages**.
2. Select **Create application → Pages → Connect to Git**. Do not choose the Worker Builds screen; it shows Preview command and Deploy command fields, which this setup does not use.
3. Connect GitHub if prompted and select `pantheonguilddn/dntrckr`.
4. Configure the build:
   - Project name: `pantheon-tools` (or another available name you prefer).
   - Production branch: select `cloudflare-secure`.
   - Framework preset: `None`.
   - Build command: leave blank.
   - Build output directory: `.` because `index.html` and `functions/` are placed at the repository root.
   - Root directory: leave blank.
5. Click **Save and Deploy**. Wait for a successful Pages deployment and note the assigned `https://PROJECT-NAME.pages.dev` address.

If you cannot select `cloudflare-secure` during setup, finish connecting the repository first, then open **Settings → Builds → Branch control** and select `cloudflare-secure` as the Production branch. Keep the existing GitHub Pages branch unchanged. If the Pages option is not shown, return to **Create application** and choose Pages, not Workers. No Preview command or Deploy command is required in Pages.

## C. Create the D1 tables

1. Open **Storage & Databases → D1** and select the existing `pantheon-db`.
2. Open its SQL **Console**.
3. Open `schema.sql` from the GitHub repository, copy its complete contents, paste into the D1 console, and click **Execute**.
4. Confirm it succeeds. The statements use `CREATE TABLE IF NOT EXISTS`; running the schema again is safe and does not delete existing records.

## D. Bind D1 to Pages (dashboard only)

1. Open **Workers & Pages → pantheon-tools**.
2. Open **Settings → Bindings**.
3. Choose **Add binding → D1 database**.
4. Use variable name `PANTHEON_DB` and select database `pantheon-db`.
5. Save the binding. If Cloudflare offers production/preview choices, configure Production. Keep preview deployments disabled until production works.
6. Redeploy the Pages project so the binding is active.

Do not create a `wrangler.jsonc` fragment or paste D1 configuration into a new file. This setup relies on the dashboard binding, and there is no Wrangler file in this bundle.

## E. Register Discord OAuth

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application named `Pantheon Tools`.
2. Under **OAuth2**, copy the Client ID and generate/copy the Client Secret.
3. Under **OAuth2 → Redirects**, add the exact callback URL using your actual Pages hostname:

   `https://YOUR-PROJECT.pages.dev/auth/discord/callback`

   Replace `YOUR-PROJECT` with the Pages subdomain Cloudflare gave you. Do not include a trailing slash.
4. Save the Discord application settings.

The bundle requests the `identify` scope only. It does not request a Discord password, bot token, server-management permission, or message access.

## F. Add Pages environment variables

1. In Cloudflare, open **Workers & Pages → pantheon-tools → Settings → Variables and Secrets**.
2. Add these to the **Production** environment:
   - `DISCORD_CLIENT_ID` — text variable; paste the Discord Client ID.
   - `DISCORD_CLIENT_SECRET` — secret; paste the Discord Client Secret.
   - `BOOTSTRAP_ADMIN_DISCORD_ID` — text variable; paste your own numeric Discord user ID.
3. Save and redeploy the Pages project.

To get your numeric Discord ID, enable **User Settings → Advanced → Developer Mode** in Discord, then right-click your own profile and choose **Copy User ID**. Paste only the numeric ID in Cloudflare. The first login from that exact account automatically creates the initial admin allowlist entry.

Never put the Client Secret into GitHub, HTML, a public file, or the D1 tables.

## G. First administrator login

1. Open `https://YOUR-PROJECT.pages.dev`.
2. Click **Continue with Discord** and authorize the application on Discord's official domain.
3. If the configured `BOOTSTRAP_ADMIN_DISCORD_ID` matches the account, the backend adds that account as the initial admin and opens Pantheon.
4. If you get an authentication-service-not-ready message, check that the D1 schema ran, the Pages `PANTHEON_DB` binding is saved, all three variables are configured, and the latest deployment succeeded.

## H. Import existing JSONBin data

If your guild currently has JSONBin data, migrate it before adding other members.

1. While signed in as the bootstrap admin, open `https://YOUR-PROJECT.pages.dev/admin.html` or choose **Access admin** from the bottom-right session bar.
2. Under **Move the old guild record from JSONBin to D1**, enter the existing main tracker Bin ID and its JSONBin Master Key.
3. Confirm the checkbox and click **Import main record and revision journal**.
4. The page fetches the existing main record and, if configured in the main record, its separate revision journal. It sends those records to the authenticated D1 import endpoint. The old JSONBin records are read only and left untouched.
5. After a success message, clear the key field (the page clears it on success), return to Pantheon, and reload. The tracker now reads/writes through the protected D1 API.

If JSONBin reports an error, stop and keep the JSONBin record as your active backup; do not initialize an empty tracker over your only copy of the data. If you have no old guild data to migrate, use **Initialize empty tracker** instead. That action refuses to overwrite an existing `pantheon-main` record.

## I. Add permitted Discord accounts

1. Open `/admin.html` while signed in as an admin.
2. Enter each member's numeric Discord User ID and an optional label.
3. Click **Add / enable account**.
4. Tell the member to open the Pages URL and click **Continue with Discord**. They do not need a JSONBin ID or key. Their account will be denied until their numeric ID is added.
5. Use **Revoke** to disable an account. Revoking deletes its stored sessions so its next API request is denied.

This is an account allowlist, not a live guild-membership check. Removing someone from the Discord server does not automatically remove their app access unless an admin revokes their ID here.

## J. Test before inviting the guild

1. Sign in as the bootstrap admin and confirm shared data loads.
2. Add a second test Discord ID, sign in with that account, and confirm it can sync.
3. Try a third unapproved account and confirm it sees the access-denied gateway.
4. Check that unapproved requests to `/api/cloud/b/pantheon-main/latest` return `401` rather than guild data.
5. Edit a harmless test item in one browser and verify another authorized browser receives the update.
6. Check Workers/Pages and D1 metrics after ordinary use. JSONBin should no longer be used for normal live sync after migration.

## Free-tier expectation

Cloudflare's published Workers Free quota includes 100,000 requests per day; D1 Free includes 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage. This small guild tracker is designed to fit those limits with modest usage and no 30-second whole-record polling. Limits can change, so monitor the dashboard. Pages static-asset requests themselves do not count as Pages Functions invocations; API, OAuth, and D1-backed requests do.
