# Kalika Background Maintenance Bot

This folder now includes a read-only GitHub Actions maintenance bot for the live Kalika website.

It observes and reports only. It does not edit site pages, publish changes, change DNS, or collect visitor data.

## What Runs

- Daily: homepage and tool uptime, plus internal broken-link checks.
- Weekly: on-page SEO baseline checks, PageSpeed Insights, Google Search Console, and browser console checks.
- Monthly: content freshness reminders and CDN dependency checks.

Reports are written to `reports/` as Markdown and JSON. The GitHub Action commits those reports back to the repository.

## SEO Review Workflow

The weekly run checks each sitemap page for a human-friendly title length, meta description length, canonical tag, one H1, and tool-page structured data. Any issues are reported as suggestions only.

The repo also has a local, password-protected review panel. Start it with:

```bash
npm run admin:seo
```

Use it to scan pages, export a CSV or JSON snapshot, and draft a review note before making an SEO edit. The panel does not live on the public website, does not write files, and does not publish changes.

## GitHub Setup

Add these optional repository settings after `kalikatools.com` is live:

- Repository variable `KALIKA_SITE_ORIGIN`: `https://kalikatools.com`
- Repository variable `KALIKA_PERFORMANCE_MIN`: `80`
- Repository secret `PAGESPEED_API_KEY`: Google PageSpeed Insights API key
- Repository variable `GSC_PROPERTY`: the exact Search Console property, usually `sc-domain:kalikatools.com` or `https://kalikatools.com/`
- Repository secret `GSC_SERVICE_ACCOUNT_JSON`: service-account JSON that has read access in Google Search Console

The daily checks work without Google API keys. Weekly Google checks are skipped with a clear report note until those credentials exist.

## Manual Runs

From the repo root:

```bash
npm install
npx playwright install chromium
npm run check:daily
npm run check:weekly
npm run check:monthly
```

For local testing against the private preview:

```bash
KALIKA_SITE_ORIGIN=https://kalika-workbench.adarsha11.chatgpt.site npm run check:daily
```

On Windows PowerShell, if Playwright's downloaded browser is not installed but Chrome is available, weekly console checks can use:

```powershell
$env:KALIKA_CHROME_EXECUTABLE = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run check:weekly
```
