# Kalika security

Updated 2026-10-02. Public site: https://kalikatools.com.

## Reporting

Report a suspected vulnerability privately to hello@kalikatools.com. This address is an owner-requested placeholder: the owner must activate and monitor it. Until then, use the existing contact address on /contact. Do not send private documents, passwords or exploit payloads containing another person's data. Include the affected tool, browser and a minimal synthetic reproduction. No response-time or bounty commitment is implied.

`public/.well-known/security.txt` expires on 2027-10-02; renew it before that date.

## Deployment boundary

Only public/ is uploaded as static assets. The root legacy site copy, local admin, reports and credentials are not public assets. worker.mjs applies response headers and canonical redirects at Cloudflare's edge. It accepts GET/HEAD, never reads request bodies, and has no database, file-upload endpoint or telemetry. Every request invokes this Worker, so monitor the account's Worker request quota; this changes the previous assets-only usage model. No paid plan was enabled.

Run `npm ci`, `npm run build`, `npm run check:security`, then the affected tool tests before `npm run deploy`. The build derives counts from the actual categorized homepage tool links and rejects missing or duplicate tool cards. It also generates canonical routes and per-page JSON-LD hashes. Do not hand-edit config/security-manifest.json.

## Headers and CSP

The Worker sends HSTS (one year, includeSubDomains), nosniff, DENY framing, strict-origin-when-cross-origin referrers, same-origin opener policy, and a restrictive Permissions-Policy. Only /tools/document-scanner permits same-origin camera use. It does not automatically request camera access.

The full CSP starts in Report-Only. A small enforced policy already denies framing/objects and restricts base URLs. There is no remote CSP report collector: inspect DevTools security-policy messages rather than sending URLs or document information to another service.

Script sources are self and www.googletagmanager.com (consented GA). No unsafe-inline or unsafe-eval JavaScript is permitted. JSON-LD is hashed per page; there are no executable inline public scripts. Local PDF.js image codecs need wasm-unsafe-eval, which permits WebAssembly compilation, not JavaScript string evaluation. Existing inline CSS and dynamically set styles require style-src unsafe-inline. Worker sources are self/blob; images self/data/blob plus the two GA collection hosts; fonts self/data. Connect sources are self, api.frankfurter.dev, open.er-api.com, www.googletagmanager.com, www.google-analytics.com and region1.google-analytics.com. No jsDelivr, remote font host, ad host or wildcard host is allowed.

To enforce: first review Report-Only messages while using every tool and optional Analytics in supported browsers. Set `vars.CSP_ENFORCE` to the string `"true"` in wrangler.jsonc, run build/security checks and affected browser tests, then deploy. Verify Content-Security-Policy contains the full policy and the Report-Only header is absent. Roll back by setting it to `"false"` and redeploying. Do not add unsafe-eval to fix a PDF rendering problem.

HTML revalidates on every visit; unversioned assets have a one-hour, revalidating cache. No current asset has a content-fingerprinted filename, so none is marked immutable. If a fingerprinted asset pipeline is added, generate immutable rules only for verified content-hashed filenames. Redirects and error responses are no-store.

## Privacy and external services

Tool data stays in tab memory. Downloads are created locally. Only currency codes are sent to Frankfurter/ExchangeRate-API; amounts are not. Rate responses are validated and cached in memory, with stale results explicitly labelled.

GA ID G-VLJV7JE2DN is a public identifier, not a secret. Analytics is off until the visitor opts in through Privacy choices. Rejection removes first-party _ga cookies and stops future collection. The consent and language preference are the only site-written local-storage settings. GA Enhanced Measurement was disabled in the matching web stream on 2026-10-02; keep form, download, search and automatic interaction collection disabled. Account settings can change independently of this code. Never enable user-provided-data collection or add input/filename analytics events. Cloudflare and external rate providers still receive ordinary connection metadata.

## Dependencies and checks

PDF.js, pdf-lib, JSZip and QRCode.js are self-hosted with licenses. package-lock.json pins transitive versions; direct versions are exact. Run scripts/vendor-pdf.mjs after approved dependency updates, inspect changes and rerun PDF/image tests. config/vendor-integrity.json detects unexpected changes to vendor files. This is a review aid, not proof that upstream packages have no bugs.

Google's changing gtag script cannot have a stable SRI digest; it is the sole documented dynamic external-script exception, consent-gated and host-restricted by CSP. CI checks external HTML scripts for SRI, first-party DOM/eval/HTTP patterns, vendor hashes, counts, SEO, headers, npm advisories and Git-history secrets. Static pattern checks and npm audit cannot prove absence of vulnerabilities.

The IndexNow ownership key is deliberately public and has a narrowly scoped gitleaks exception. No credential leak was found in the scanned Git history. Tests and reports use synthetic files, not visitor documents.

## Local admin and secrets

The admin binds only to loopback, checks Host/Origin, uses an HttpOnly SameSite=Strict session cookie, rate-limits sign-in and renders scanned data as text. Never expose its port through a tunnel, proxy or public bind. Its local HTTP cookie is intentionally not Secure, because it is served only over loopback HTTP. Use a strong password via the environment or the temporary password printed in the local terminal; do not put it in Git.

Keep GitHub, Cloudflare and Google 2FA enabled. Use least-privilege repository/deployment tokens. Store SMTP_APP_PASSWORD and other service credentials in GitHub Actions secrets, not config files. If a credential is exposed: revoke it at its provider first, issue a replacement, update the secret store, rerun the affected job, and review activity. Rewriting Git history alone does not revoke a leaked key. Do not rotate public GA/verification IDs as if they were passwords.

## Live verification

In PowerShell use curl.exe (not the Invoke-WebRequest alias):

```powershell
curl.exe -sI https://kalikatools.com/
curl.exe -sI https://kalikatools.com/tools/document-scanner
curl.exe -sI https://kalikatools.com/tools/jpg-to-pdf
curl.exe -sI https://kalikatools.com/definitely-missing-security-check
curl.exe -sI http://www.kalikatools.com/tools/merge-pdf.html
curl.exe -sIL --max-redirs 5 http://www.kalikatools.com/tools/merge-pdf.html
curl.exe -s https://kalikatools.com/.well-known/security.txt
```

Expected: canonical HTTPS non-www destination, headers on normal/error responses, camera allowed only on scanner. Cloudflare account-level redirects, challenges or Always Use HTTPS may run before this Worker and need separate review if they introduce a chain.

Optional independent scans: https://securityheaders.com/?q=https%3A%2F%2Fkalikatools.com%2F and https://observatory.mozilla.org/ . Report-Only CSP will not receive the same score as enforced CSP. Scores are not a security guarantee.
