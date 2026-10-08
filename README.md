# Kalika

Kalika is a free tools website without accounts, a database or server-side file processing. Optional Google Analytics loads only after consent. See SECURITY.md for the edge headers, privacy boundary and verification steps.

## Live Deployment

- Domain: `https://kalikatools.com`
- Hosting target: Cloudflare Workers with Static Assets
- Static asset folder: `public/`
- Cloudflare config: `wrangler.jsonc`

Cloudflare should deploy with the default command:

```bash
npm run deploy
```

The `wrangler.jsonc` file points Cloudflare at `./public`, uses `404.html` for missing pages, and lets clean URLs such as `/tools/image-compressor` resolve from matching `.html` files.

## Local Checks

Run the read-only maintenance checker after starting a local preview:

```bash
npm run check:daily
```

The maintenance bot only reports problems. It does not edit files, publish changes, change DNS, or collect visitor data.

## Local SEO Admin Panel

The SEO admin panel is kept outside the public website. It runs locally on your computer with a username and password:

```bash
npm run admin:seo
```

The terminal prints the local address, username, and password. By default the address is `http://127.0.0.1:8789`, so other people on the internet cannot open it from the live Kalika site.

To set your own password on Windows PowerShell:

```powershell
$env:KALIKA_ADMIN_PASSWORD = "choose-a-strong-password"
npm run admin:seo
```

The panel scans the public sitemap, checks each page's title, meta description, canonical tag, H1, and structured data, then lets you draft review notes for future edits.

This panel is intentionally review-only. It cannot publish changes to the live site. To apply an SEO update, edit the matching file in `public/`, commit it to GitHub, and deploy through Cloudflare.

## Private OCR

`/tools/ocr-pdf` recognizes printed text in one PDF or JPG/PNG/WebP image entirely in the browser. Tesseract.js 7 runs in one cancellable worker; PDF.js renders selected PDF pages. Engine and language assets are self-hosted and loaded only after the user starts recognition. Model IndexedDB caching is disabled; document inputs and recognized text are never uploaded or stored by the application.

The tool processes up to 10 selected PDF pages per run, with working images capped at 2,200 pixels on the longest side. TXT output is editable; optional searchable PDF output contains rendered images and the original OCR text layer. Text-box corrections do not change that layer. Recognition does not preserve original PDF forms, links, accessibility structure or signature validity, and users must review results. Blank recognition does not offer a searchable PDF.

Run `node scripts/test-ocr.mjs` for real language fixtures, searchable/visible PDF checks, page ordering, cancellation/retry, dependency failure, restricted canvas handling, lazy loading, no uploads or IndexedDB, and mobile layout. The suite also runs inside `scripts/test-all-tools.mjs` with enforced CSP.

To reproduce OCR assets after `npm ci`, run `node scripts/vendor-ocr.mjs`. Versions and the exact official `tessdata_fast` revision are pinned in `config/ocr-vendor.json`; hashes and upstream licenses are committed. The small first-party adapter uses the pinned Tesseract worker protocol, so upgrade the engine, adapter and tests together.

Guide metadata and topical links: run `node scripts/update-editorial.mjs` after regenerating tools/category pages, then `npm run build`. Reading time is estimated at 200 words per minute; known article dates are preserved. The Nepali Tools hub groups existing tools without duplicating their homepage category cards.


## Automated performance and accessibility checks

- `npm run check:quality`: scan all canonical public pages with axe-core (WCAG A/AA tags), plus mobile scans of five representative pages; run three simulated-mobile Lighthouse measurements per representative page and report median scores.
- `npm run check:accessibility`: accessibility only.
- `npm run check:lighthouse`: Lighthouse only. For a quick setup check, use `node scripts/check-quality.mjs --mode=lighthouse --runs=1`.
- Uses the production Worker through the enforced-CSP local test server by default. Set `KALIKA_TEST_ORIGIN=https://kalikatools.com` for read-only live checks. Local pages intentionally have noindex, so the local Lighthouse SEO category is not graded; live reports include it.
- Reports: `reports/quality.md`, machine-readable `reports/quality/results.json`, and Lighthouse HTML/JSON files. These are ignored locally and saved as GitHub Actions artifacts, never uploaded to a public Lighthouse storage service.
- `.github/workflows/quality.yml` runs on pushes, pull requests and manual dispatch. Serious/critical axe findings, mobile performance below 80, or failed checks produce a failed check; moderate/minor and manual-review items remain visible in the artifacts. Automated checks do not certify accessibility or measure field Core Web Vitals.
- The existing weekly/all maintenance runs also check the live site and include the quality report and check outcome in the existing Gmail report. No additional mail credentials are required. Nothing auto-edits, merges or deploys.
- Installed pinned `lighthouse` and `@axe-core/playwright`. The older `@lhci/cli` wrapper was evaluated and removed because its dependency tree introduced unresolved advisories. Lighthouse runs directly in CI instead. Wrangler is updated and its `sharp` dependency patched via an exact override; `npm audit` must remain clean.

The first axe scan found contrast issues on two guide buttons, the calendar current-day label and the Nepali typing action, plus an ARIA role issue on typing suggestions. These were corrected manually during setup; the scheduled checker only reports findings.

## Dependency proposals and report delivery

`.github/renovate.json` prepares Renovate for only npm and GitHub Actions updates, with automatic merging disabled, exact versions, a Monday morning Nepal review window, three open PRs maximum, and dashboard approval for majors and vendored browser engines. The hosted Renovate GitHub App must be installed on **only AdarshaPangeni7/kalika** before it runs. App installation is a separate GitHub permission grant; the config file alone does not activate it.

Dependabot version updates remain active until Renovate installation is confirmed. Afterwards disable overlapping Dependabot version updates; retain GitHub security alerts.

`node scripts/report-dependencies.mjs` reads the public repository's open dependency PRs and Renovate dashboard without credentials. Weekly/all maintenance runs save `reports/dependencies.md` and include it in the existing Gmail summary. No open PRs is not evidence that a bot is installed or fully current; API failures are reported as unavailable.

Where to read reports:
- Gmail: scheduled weekly maintenance, quality and dependency review summary via the existing configured recipient.
- GitHub Actions: run summaries and report artifacts. Quality artifacts last 30 days; maintenance artifacts last 90 days.
- GitHub Issues/Pull requests: Renovate Dependency Dashboard and proposed dependency updates. GitHub's own email notifications depend on the account notification preferences.
- Local admin: only `reports/latest.md` generated locally. It does not synchronize GitHub artifacts automatically.
