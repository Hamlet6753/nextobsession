# Creator admin and cloud import

This patch is based on the current dev branch. It adds /admin/import and preserves public features. No age or gender is inferred automatically. Both fields are nullable and editable only in the admin form; they are not used in public filters, cards, metadata or schema.

## Install

1. Extract the patch into the repository root, replacing matching files.
2. Run `npm install` in the website repository (not the local Python scraper folder).
3. Apply the migration ONCE to production:

```powershell
npx wrangler d1 execute nextobsession-db --remote --file migrations/20261119_creator_manual_fields.sql
```

The migration adds age (integer, 18 through 120) and gender (female, male, nonbinary, other). Existing profiles get NULL. Do not rerun the SQL file after it succeeds. To check existing columns, run `npx wrangler d1 execute nextobsession-db --remote --command "PRAGMA table_info(creator)"`.

For local testing, apply the same migration to your existing local schema:

```powershell
npx wrangler d1 execute nextobsession-db --local --file migrations/20261119_creator_manual_fields.sql
```

Apply separately to any preview database you want to use. It is a different database from production.

4. Set the administrator password in Cloudflare:

```powershell
npx wrangler secret put ADMIN_PASSWORD
```

Paste a unique random ASCII password of at least 20 characters at the prompt. Do not put the password in wrangler.jsonc, Git, screenshots or client JavaScript. For localhost only, add `ADMIN_PASSWORD="your-long-random-password"` to .dev.vars (already ignored by Git).

5. Build and push using your existing dev/main workflow:

```powershell
npm run build
```

The included wrangler.jsonc adds BROWSER and nodejs_compat while preserving domain, D1 bindings, previews, vars and TXT routing. The package and lockfile include @cloudflare/playwright. Browser Run uses the already purchased Workers Paid plan; the patch does not buy or upgrade services.

6. Open https://nextobsession.fans/admin/import. The browser will request HTTP Basic authentication: username `admin`, password is ADMIN_PASSWORD. Public visitors cannot load or save admin data without these credentials. Use HTTPS. There is no public admin link.

## Workflow

- Start with ONE known profile to test Browser Run access from Cloudflare. Live OnlyFans access has not been tested from this workspace; cloud IPs may be restricted.
- Paste up to five usernames or OnlyFans profile URLs, one per line. The UI processes them sequentially, one request per profile, and stops at blocked/rate_limited. There are no automatic retries or access bypasses.
- Use Review draft or Review existing to populate the form. Edit fields including Age and Gender, then Save profile. No scrape result is saved automatically.
- Subscription prices are entered in integer CENTS, not dollars. Empty numeric fields become NULL; zero is preserved. Existing values survive missing/null fields in scraped previews. Clearing an existing field in the editor and clicking Save explicitly stores NULL.
- Existing usernames cannot be accidentally inserted twice. Load existing is an indexed username lookup; there is no full-database list/download.
- New manually creates an editable blank draft without opening a browser. It also requires Save.
- A save updates only recognized editable columns and updated_at, preserving unrelated database columns. Existing FTS triggers remain active.
- Age is a manually entered current value, not a birth date, so it does not increase automatically.
- The import/editor form does not guess gender or age from images, bio or usernames. Use Not specified for unknown values.
- Stopping import waits for the current request to finish. Unsaved drafts are browser memory only and disappear on reload; the form warns before discarding unsaved field edits.

## Limits and validation

Admin writes require authentication, same-origin JSON requests and server-side validation. Request bodies are limited to 64 KiB. Usernames are restricted to OnlyFans profile names; arbitrary scrape targets are rejected. Browser instances are closed after each profile or timeout. Failed scrape results do not change D1. Credentials and full scraped profiles are not printed in Worker logs.

The auth password grants edit rights for all creator records. Browser sessions cache HTTP Basic credentials; close the browser session or use a private window when done on a shared computer. Cloudflare Access can be added later if named accounts and sign-out are required.

Validation performed locally: migration and persistence using SQLite; authentication/origin rejection; age/gender NULL handling; duplicate prevention; FTS synchronization; scrape draft/no-write behavior; public age/gender exclusion; existing launch/schema tests; Wrangler dry-run build. Browser Run access to OnlyFans requires the first live test after deployment.

```powershell
node tests/admin.mjs
```

This automated test requires Python 3 on PATH for its temporary SQLite database. It never calls OnlyFans or a production D1 database.
