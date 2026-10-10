# Kalika security audit — 10 October 2026

Scope: public/, Cloudflare worker and owner admin, report ingestion, local SEO admin. No URL masking tool has been built. No hosting upgrade.

## Already done
- 4: Files stay in browser; PDFs have size/header/parser checks; images have MIME/size/decoder/pixel checks; safe download filenames. No server upload or storage of visitor files.
- 5, 13: Owner GitHub numeric ID enforced server-side on protected APIs. Missing config locks access.
- 7: No self-issued JWT secrets. Report ingestion verifies GitHub RS256 OIDC signature, issuer, audience, timestamps, repository IDs, main branch, workflow and run ID. Admin uses random opaque 8-hour sessions.
- 8: OAuth secret only in Cloudflare environment; Google measurement IDs are public identifiers, not credentials.
- 11: No permissive CORS headers; admin origin restricted.
- 12: Live sessions are HttpOnly, Secure, SameSite cookies; no auth tokens in localStorage. Local HTTP loopback cookies intentionally omit Secure.
- 15: Report ingestion has signed identity verification; no generic unauthenticated webhook.
- 17: No .map files in public/.
- 18: No default live password; GitHub-owner-only /admin is intentional, not a secret security boundary. Retain requested URL.
- 20: npm audit reports zero known vulnerabilities; pinned packages and vendor integrity already checked. No unnecessary upgrades.
- Public HTTPS canonical redirects, HSTS, DENY framing and nosniff already exist.

## Fixed now
- 2: Switch full public CSP from report-only to enforcement after browser validation. Existing safe DOM rendering remains unchanged.
- 3: Local logout now POST + session CSRF token + origin check instead of GET.
- 6: Extend edge rate limiter to all admin APIs/logout; add local scan throttling. Existing login/callback/report limits retained.
- 9: Older loopback admin verifies scrypt salted password hash in memory; environment password removed after derivation. No password database exists.
- 16: Local server scanner restricted to exact Kalika HTTPS origin, validates routes, rejects redirects and times out fetches. Live server fetches use fixed GitHub endpoints.
- 19: Local admin no longer prints configured/generated passwords. No raw tokens or request bodies logged by live admin.
- Add HSTS to admin responses (public headers already existed).

## Not applicable
- 1: No SQL database/queries.
- 14: No Postgres/Supabase; KV uses owner-controlled keys and server authorization.
- Server upload storage and filenames: no visitor upload endpoint.
- Public forms/typing tools do not mutate server state, so server CSRF/rate limits do not apply to them.
- Changing admin URL is not required protection and would break the user's requested /admin path.

## Manual verification
- 10: Enable/confirm GitHub MFA for AdarshaPangeni7 and Cloudflare account MFA. OAuth alone does not prove MFA and app code cannot enforce GitHub account configuration. https://github.com/settings/security
- Local fallback: set KALIKA_ADMIN_PASSWORD securely before npm run admin:seo; do not commit it. Normal live admin uses GitHub and needs no new variable.
- Existing GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET/ADMIN_STORE/ADMIN_RATE_LIMIT remain required; no new production secrets.

## Limits
Audit checks code and controlled browser tests, not a guarantee against all vulnerabilities or a verification of provider account MFA. No credentials changed or rotated without evidence of exposure.
